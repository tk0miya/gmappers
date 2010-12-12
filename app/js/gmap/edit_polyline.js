
function tlm_init(map, polyline_data) {
  this.map = map;

  this.points       = new Array();
  this.markers      = new Array();
  this.trackline    = null;
  this.form         = document.getElementById(map.forms.polyline_form);
  this.color_field  = document.getElementById(map.forms.color_field);
  this.points_field = document.getElementById(map.forms.points_field);
  this.levels_field = document.getElementById(map.forms.levels_field);

  if(polyline_data) {
    var points = map.decodeLine(polyline_data.points);
    for(var i = 0; i < points.length; i++) {
      this.add_trackpoint(points[i]);
    }
  }
}

function tlm_add_trackpoint(point) {
  var idx = this.points.length;
  var marker = this.draw_marker(point);

  this.points.push(point);
  this.markers.push(marker);
  this.form.options[idx] = new Option(point.toString(), idx);

  this.redraw();
}

function tlm_remove_trackpoint() {
  var idx = this.form.selectedIndex;

  if(0 <= idx && idx < this.points.length) {
    var marker = this.markers[idx];
    this.map.removeOverlay(marker);

    this.points.splice(idx, 1);
    this.markers.splice(idx, 1);
    this.form.options[idx] = null;

    this.redraw();
  }
}

function tlm_focus_trackpoint() {
  var idx = this.form.selectedIndex;

  if(0 <= idx && idx < this.points.length) {
    this.map.panTo(this.points[idx]);
  }
}

function tlm_shift_trackpoint(direct) {
  var i = this.form.selectedIndex;
  var j = i + (direct > 0 ? 1 : -1);

  if(0 <= i && i < this.points.length && 0 <= j && j < this.points.length) {
    this.swap_trackpoint(i, j);

    this.form.selectedIndex = j;
    this.redraw();
  }
}

function tlm_swap_trackpoint(i, j) {
  if(0 <= i && i < this.points.length && 0 <= j && j < this.points.length) {
    var tmp_point = this.points[i];
    var tmp_marker = this.markers[i];
    var tmp_value = this.form.options[i].value;
    var tmp_text = this.form.options[i].text;

    this.points[i] = this.points[j];
    this.markers[i] = this.markers[j];
    this.form.options[i].value = this.form.options[j].value;
    this.form.options[i].text = this.form.options[j].text;

    this.points[j] = tmp_point;
    this.markers[j] = tmp_marker;
    this.form.options[j].value = tmp_value;
    this.form.options[j].text = tmp_text;
  }
}

function tlm_find_trackpoint(marker) {
  var idx = null;

  for(var i = 0; i < this.markers.length; i++) {
    if(this.markers[i] == marker) {
      idx = i;

      break;
    }
  }

  return idx;
}

function tlm_divide_trackline() {
  var idx = this.form.selectedIndex;

  if(0 <= idx && idx < this.points.length - 1) {
    var from = this.points[idx];
    var to   = this.points[idx + 1];

    var bounds = new GLatLngBounds(from, from);
    bounds.extend(to);
    var new_point = bounds.getCenter();

    this.add_trackpoint(new_point);

    var len = this.points.length;
    for(var i = len - 2; i > idx; i--) {
      this.swap_trackpoint(i, i + 1);
    }

    this.redraw();
  }
}

function tlm_redraw() {
  if(this.trackline) {
    this.map.removeOverlay(this.trackline);
  }

  var encoded_data = this.map.encode_polyline_data(this.points);
  var color_id = this.color_field.selectedIndex;
  encoded_data.color = this.color_field.options[color_id].value;

  this.trackline = new GPolyline.fromEncoded(encoded_data);
  this.map.addOverlay(this.trackline);

  this.points_field.value = encoded_data.points;
  this.levels_field.value = encoded_data.levels;
}

function tlm_draw_marker(point) {
  var self = this;
  var marker = new GMarker(point, { draggable: true });

  GEvent.addListener(marker, 'click',
                     function() { self.on_marker_selected(marker); });
  GEvent.addListener(marker, 'dragstart',
                     function() { self.on_marker_selected(marker); });
  GEvent.addListener(marker, 'dragend',
                     function() { self.on_marker_moved(marker); });

  this.map.addOverlay(marker);

  return marker;
}

function tlm_get_polyline_data() {
  var encoded_data = this.map.encode_polyline_data(this.points);

  return encoded_data;
}

function tlm_on_map_clicked(overlay, point) {
  if(overlay == null) {
    this.add_trackpoint(point);
  }
}

function tlm_on_marker_selected(marker) {
  var idx = this.find_trackpoint(marker);

  if(0 <= idx && idx < this.points.length) {
    this.form.selectedIndex = idx;
  }
}

function tlm_on_marker_moved(marker) {
  var idx = this.find_trackpoint(marker);

  if(0 <= idx && idx < this.points.length) {
    var point = marker.getPoint();

    this.points[idx] = point;
    this.form.options[idx] = new Option(point.toString(), idx);
    this.form.selectedIndex = idx;

    this.redraw();
  }
}

function TrackLineManager(map, polyline_data) {
  this.init                = tlm_init;
  this.add_trackpoint      = tlm_add_trackpoint;
  this.remove_trackpoint   = tlm_remove_trackpoint;
  this.focus_trackpoint    = tlm_focus_trackpoint;
  this.shift_trackpoint    = tlm_shift_trackpoint;
  this.swap_trackpoint     = tlm_swap_trackpoint;
  this.find_trackpoint     = tlm_find_trackpoint;
  this.divide_trackline    = tlm_divide_trackline;
  this.redraw              = tlm_redraw;
  this.draw_marker         = tlm_draw_marker;
  this.get_polyline_data   = tlm_get_polyline_data;
  this.on_map_clicked      = tlm_on_map_clicked;
  this.on_marker_selected  = tlm_on_marker_selected;
  this.on_marker_moved     = tlm_on_marker_moved;

  this.init(map, polyline_data);
}


function gpe_on_config_loaded() {
  var id = this.current_polyline_id;

  if(id != null && 0 <= id && id < this.polylines.length) {
    var polyline_data = this.polylines[id][1];
    this.trackline = new TrackLineManager(this, polyline_data);

    var polyline = this.polylines[id][0];
    this.removeOverlay(polyline);
  } else {
    this.trackline = new TrackLineManager(this);
  }

  var self = this;
  GEvent.addListener(this, 'click', function(overlay, point) {
    if(overlay == null) {
      self.trackline.on_map_clicked(overlay, point);
    }
  });
}

function GMapPolylineEditor(id, config, forms, polyline_id) {
  var self = new GoogleMap(id, config);

  self.current_polyline_id = polyline_id;
  self.trackline           = null;
  self.forms               = forms;
  self.on_config_loaded    = gpe_on_config_loaded;

  return self;
}
