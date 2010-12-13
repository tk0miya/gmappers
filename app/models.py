from google.appengine.ext import db

class Map(db.Model):
    id = db.IntegerProperty(required=True)
    name = db.StringProperty(required=True)
    author = db.StringProperty(required=True)
    description = db.TextProperty()
    tag = db.StringListProperty()
    edit_key = db.StringProperty(required=True)
    created_at = db.DateTimeProperty(auto_now_add=True)
    updated_at = db.DateTimeProperty(auto_now=True)


class Marker(db.Model):
    map = db.ReferenceProperty(Map)
    geopt = db.GeoPtProperty(required=True)
    label = db.TextProperty()


class Polyline(db.Model):
    map = db.ReferenceProperty(Map)
    points = db.TextProperty(required=True)
    levels = db.TextProperty(required=True)


class Tag(db.Model):
    name = db.StringProperty(required=True)
    type_id = db.IntegerProperty(required=True)
    order_id = db.IntegerProperty(required=True)
