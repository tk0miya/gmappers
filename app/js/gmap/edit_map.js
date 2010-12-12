
function goe_redraw() {
  this.clearOverlays();

  this.redraw_polylines();
  this.redraw_markers();
}

function goe_redraw_polylines() {
  for(var i = 0; i < this.polylines.length; i++) {
    var polyline = null;

    if(this.current_id == i && this.current_type == 1) {
      polyline = this.create_selected_polyline(i);
    } else {
      polyline = this.polylines[i][0];
    }

    if(polyline) {
      this.addOverlay(polyline);
    }
  }
}

function goe_create_selected_polyline(idx) {
  var encoded_polyline = this.polylines[idx][1];
  encoded_polyline.color = "#FF0000";

  return new GPolyline.fromEncoded(encoded_polyline);
}

function goe_redraw_markers() {
  for(var i = 0; i < this.markers.length; i++) {
    var marker = this.markers[i][0];

    if(marker) {
      this.addOverlay(marker);
    }
  }
}

function goe_remove_overlay() {
  var index = this.get_selected_overlay();

  if(index && this.remove_action_url) {
    var param = "?overlay_id=" + index.id + "&type=" + index.type;
    var url = this.remove_action_url + param;

    var self = this;
    var request = GXmlHttp.create();
    request.open("GET", url, true);
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
        self.current_type = null;
        self.reload_config();
      }
    }
    request.send(null);
  }
}

function goe_switch_overlay() {
  var index = this.get_selected_overlay();

  if(index && index.type == "line") {
    var polyline = this.polylines[index.id];

    if(polyline) {
      this.current_type = 1;
      this.current_id = index.id;

      var bounds = this.get_polyline_bounds(polyline[1].points);
      if(bounds) {
        this.panTo(bounds.getCenter());
      }
    }
  } else if(index && index.type == "mark") {
    var marker = this.markers[index.id];

    if(marker) {
      this.current_type = 2;
      this.current_id = index.id;
      this.panTo(marker[1].point);
    }
  }

  this.redraw();
}

function goe_get_polyline_bounds(encoded_points) {
  var bounds = null;
  var points = this.decodeLine(encoded_points);

  if(points.length > 0) {
    bounds = new GLatLngBounds(points[0], points[0]);

    for(var i = 1; i < points.length; i++) {
      bounds.extend(points[i]);
    }
  }

  return bounds;
}

function goe_get_selected_overlay() {
  var n = this.form.selectedIndex;

  var index = null;

  if(n >= 0) {
    var m = this.form.options[n].value.split("_");
    var type = m[0];
    var id = m[1];

    index = { type: type, id: id };
  }

  return index;
}

function goe_init_form() {
  for(var i = 0; i < this.form.options.length; i++) {
    this.form.options[0] = null;
  }

  var idx = 0;
  for(var i = 0; i < this.polylines.length; i++) {
    var id = "line_" + i;
    var label = "Trackline #" + (i + 1);

    this.form.options[idx++] = new Option(label, id);
  }

  for(var i = 0; i < this.markers.length; i++) {
    var id = "mark_" + i;
    var label = "Marker #" + (i + 1);

    this.form.options[idx++] = new Option(label, id);
  }
}

function goe_on_config_loaded() {
  this.init_form();
  this.redraw();
}

function GMapOverlayEditor(id, config, overlays_form) {
  var self = new GoogleMap(id, config);

  self.form                     = document.getElementById(overlays_form);
  self.current_type             = null;
  self.current_id               = null;

  self.init_form                = goe_init_form;
  self.switch_overlay           = goe_switch_overlay;
  self.get_polyline_bounds      = goe_get_polyline_bounds;
  self.redraw                   = goe_redraw;
  self.redraw_polylines         = goe_redraw_polylines;
  self.redraw_markers           = goe_redraw_markers;
  self.remove_overlay           = goe_remove_overlay;
  self.create_selected_polyline = goe_create_selected_polyline;
  self.get_selected_overlay     = goe_get_selected_overlay;
  self.on_config_loaded         = goe_on_config_loaded;

  return self;
}
