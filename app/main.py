# -*- coding: utf-8 -*-

import os
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


def get_template_hash():
    hash = {}

    if os.environ.get('SERVER_SOFTWARE', '').startswith('Development'):
        hash['apikey'] = 'ABQIAAAA4eql-YSnJdjJAh3TCsXYpRSVxpMzLo2MSr9OjI8XKMaS10WqSxRWW3eDU1q5dOIChUjN1E5L8yBE7w'
    else:
        # key for gmappers.monochrome.jp
        #hash['apikey'] = 'ABQIAAAASH-PWXJDalCiynGXOAga6BTc7Dug7_44qRm7yAN83pI9KXijgxSF1EgF11_vZuIk4GqCZZcMLHNwkQ'

        # key for gmappers.appspot.com
        hash['apikey'] = 'ABQIAAAA4eql-YSnJdjJAh3TCsXYpRSi_LOrAfVfZzZD9uZ9lzLXDed67hSC4VCxi2OQNI9Ty_NhclzJ3Jdpfw'

    return hash


@app.route('/')
def index():
    page = int(request.args.get('page', 0))
    kwargs = get_template_hash()

    maps = Map.all().order('-id').fetch(PAGESIZE + 1, page * PAGESIZE)
    kwargs['page'] = page
    if len(maps) == PAGESIZE + 1:
        kwargs['maps'] = maps[:PAGESIZE]
        kwargs['nextpage'] = True
    else:
        kwargs['maps'] = maps
        kwargs['nextpage'] = False

    return render_template('list.html', **kwargs)


@app.route('/list')
@app.route('/list/<tag>')
def list(tag=None):
    mode = request.args.get('mode')
    page = int(request.args.get('page', 0))
    kwargs = get_template_hash()

    query = Map.all().order('-id')
    if tag:
        query = query.filter("tag =", tag)

    maps = query.fetch(PAGESIZE + 1, page * PAGESIZE)
    kwargs['page'] = page
    if len(maps) == PAGESIZE + 1:
        kwargs['maps'] = maps[:PAGESIZE]
        kwargs['nextpage'] = True
    else:
        kwargs['maps'] = maps
        kwargs['nextpage'] = False

    return render_template('list.html', **kwargs)


@app.route('/show_map/<int:map_id>')
def show_map(map_id):
    kwargs = get_template_hash()

    kwargs['map'] = Map.all().filter("id =", map_id).get()
    return render_template('show_map.html', **kwargs)


@app.route('/show_large_map/<key>')
def show_large_map(key):
    kwargs = get_template_hash()

    if re.search('^\d+$', key):
        kwargs['map'] = Map.all().filter("id =", int(key)).get()
    elif re.search('^(\d+,)*\d+$', key):
        kwargs['map_id_list'] = ",".join(str(x) for x in key.split(','))
    else:
        map = Map.all().filter("tag =", key).fetch(1000)
        kwargs['map_id_list'] = ",".join(str(x.id) for x in map)

    return render_template('show_large_map.html', **kwargs)


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
