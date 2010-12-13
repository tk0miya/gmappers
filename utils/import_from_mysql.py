#!/usr/bin/python
# -*- coding: utf-8 -*-

import re
import _mysql
from pit import Pit

import models
from dateutil import parser
from google.appengine.ext import db


def decode(string):
    if string:
        return unicode(string, 'utf-8')
    else:
        return string

def alltags(cn):
    cn.query('SELECT * FROM tags')
    tag_rs = cn.store_result()
    for i in range(tag_rs.num_rows()):
        r = tag_rs.fetch_row()[0]

        tag = models.Tag(name=decode(r[1]),
                         type_id=int(r[2]),
                         order_id=int(r[3]))
        yield tag

def allmaps(cn):
    cn.query('SELECT * FROM maps')
    map_rs = cn.store_result()
    for i in range(map_rs.num_rows()):
        r = map_rs.fetch_row()[0]

        map = models.Map(id=int(r[0]),
                         name=decode(r[1]),
                         author=re.sub('[\r\n]', '', decode(r[2])),
                         description=decode(r[3]),
                         edit_key=r[4],
                         created_at=parser.parse(r[6]),
                         updated_at=parser.parse(r[7]))
        tags_for(cn, map)

        yield map


def tags_for(cn, map):
    sql = 'SELECT * FROM maps_tags JOIN tags ON tag_id = tags.id ' + \
          'WHERE map_id = %d'
    cn.query(sql % int(map.id))
    tag_rs = cn.store_result()

    for i in range(tag_rs.num_rows()):
        tag = tag_rs.fetch_row()
        map.tag.append(decode(tag[0][3]))

    return map.tag


def markers_for(cn, map):
    sql = 'SELECT * FROM markers WHERE map_id = %d'
    cn.query(sql % int(map.id))
    mark_rs = cn.store_result()

    markers = []
    for i in range(mark_rs.num_rows()):
        r = mark_rs.fetch_row()[0]
        marker = models.Marker(map=map,
                               geopt=db.GeoPt(float(r[2]), float(r[3])),
                               label=decode(r[4]))
        markers.append(marker)

    return markers


def polylines_for(cn, map):
    sql = 'SELECT * FROM polylines WHERE map_id = %d'
    cn.query(sql % int(map.id))
    poly_rs = cn.store_result()

    polylines = []
    for i in range(poly_rs.num_rows()):
        r = poly_rs.fetch_row()[0]
        polyline = models.Polyline(map=map,
                                   points=r[2],
                                   levels=r[3])
        polylines.append(polyline)

    return polylines


def delete_all(model):
    count = model.all().count()
    print "deleting %s ... (%d)" % (model.__name__, count)

    for o in model.all().fetch(1000):
        o.delete()

    count = model.all().count()
    if count > 0:
        delete_all(model)


def main():
    config = Pit.get('gmappers', {'require': {'host': 'localhost',
                                              'user': 'gmappers',
                                              'passwd': '',
                                              'db': 'gmappers'}})
    cn = _mysql.connect(config['host'], config['user'],
                        config['passwd'], config['db'])

    delete_all(models.Tag)
    delete_all(models.Map)
    delete_all(models.Marker)
    delete_all(models.Polyline)

    for tag in alltags(cn):
        tag.put()

    for map in allmaps(cn):
        map.put()

        for marker in markers_for(cn, map):
            marker.put()

        for polyline in polylines_for(cn, map):
            polyline.put()

        print "%s is stored to GAE." % map.name.encode('utf-8')


main()
