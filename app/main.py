# -*- coding: utf-8 -*-

import sys
sys.path.insert(0, './distlib.zip')

from google.appengine.ext.webapp.util import run_wsgi_app
from models import Map, Marker, Polyline
from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def index():
    return 'hello world'


@app.route('/show_map/<int:map_id>')
def show_map(map_id):
    map = Map.all().filter("id = ", map_id).get()
    return render_template('show_map.html', map=map)

@app.route('/xml/<int:map_id>')
def xml(map_id):
    map = Map.all().filter("id = ", map_id).get()
    map.polylines = Polyline.all().filter("map =", map).fetch(1000)
    map.markers = Marker.all().filter("map =", map).fetch(1000)
    xml = render_template('xml.rxml', maps=[map])

    resp = app.make_response(xml)
    resp.headers['Content-Type'] = 'application/xml; charset=UTF-8'
    return resp


if __name__ == '__main__':
    run_wsgi_app(app)
