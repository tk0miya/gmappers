# -*- coding: utf-8 -*-

import sys
sys.path.insert(0, './distlib.zip')

import re
import datetime
from google.appengine.ext.webapp.util import run_wsgi_app
from models import Map, Marker, Polyline
from flask import Flask, request, render_template

PAGESIZE=10

app = Flask(__name__)
app.debug = True


@app.route('/')
def index():
    page = int(request.args.get('page', 0))

    maps = Map.all().order('-id').fetch(PAGESIZE + 1, page * PAGESIZE)
    if len(maps) == PAGESIZE + 1:
        maps = maps[:PAGESIZE]
        nextpage = True
    else:
        nextpage = False

    return render_template('list.html', maps=maps, page=page, nextpage=nextpage)


@app.route('/list')
@app.route('/list/<tag>')
def list(tag=None):
    mode = request.args.get('mode')
    page = int(request.args.get('page', 0))

    query = Map.all().order('-id')
    if tag:
        query = query.filter("tag =", tag)

    maps = query.fetch(PAGESIZE + 1, page * PAGESIZE)
    if len(maps) == PAGESIZE + 1:
        maps = maps[:PAGESIZE]
        nextpage = True
    else:
        nextpage = False

    return render_template('list.html', maps=maps, page=page, nextpage=nextpage, mode=mode)


@app.route('/show_map/<int:map_id>')
def show_map(map_id):
    map = Map.all().filter("id =", map_id).get()
    return render_template('show_map.html', map=map)


@app.route('/show_large_map/<key>')
def show_large_map(key):
    if re.search('^\d+$', key):
        map = Map.all().filter("id =", int(key)).get()
        return render_template('show_large_map.html', map=map)
    elif re.search('^(\d+,)*\d+$', key):
        map_id_list = ",".join(str(x) for x in key.split(','))
        return render_template('show_large_map.html', map_id_list=map_id_list)
    else:
        map = Map.all().filter("tag =", key).fetch(1000)
        map_id_list = ",".join(str(x.id) for x in map)
        return render_template('show_large_map.html', map_id_list=map_id_list)


@app.route('/xml/<map_id>')
def xml(map_id):
    if re.search('^\d+$', map_id):
        maps = Map.all().filter("id = ", int(map_id)).fetch(1)
    else:
        map_id_list = [int(x) for x in map_id.split(',')]
        maps = Map.all().filter("id IN", map_id_list).fetch(1000)

    for map in maps:
        map.polylines = Polyline.all().filter("map =", map).fetch(1000)
        map.markers = Marker.all().filter("map =", map).fetch(1000)

    xml = render_template('map.xml', maps=maps)

    resp = app.make_response(xml)
    resp.headers['Content-Type'] = 'application/xml; charset=UTF-8'
    return resp


@app.route('/list_tags')
def list_tags():
    tags = {}
    for map in Map.all().fetch(1000):
        for tag in map.tag:
            if tag not in tags:
                tags[tag] = 0

            tags[tag] += 1

    return render_template('list_tags.html', tags=tags)


@app.route('/whats')
def whats():
    return render_template('whats.html')


@app.route('/sitemap')
@app.route('/sitemap.xml')
def sitemap():
    maps = Map.all().order('-id').fetch(1000)
    for map in maps:
        map.lastmod = datetime.datetime.now().isoformat()

    return render_template('sitemap.xml', maps=maps)



if __name__ == '__main__':
    run_wsgi_app(app)
