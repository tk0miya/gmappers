function gme_create_marker(marker_data, is_target) {
  var marker = new GMarker(marker_data.point, { draggable: is_target });

  if(is_target) {
    var self = this;

    GEvent.addListener(marker, 'click', function() {
      self.on_marker_clicked();
    });

    GEvent.addListener(marker, 'dragend', function() {
      self.on_marker_moved();
    });
  } else {
    var html = this.generate_baloon_html(marker_data.text);

    GEvent.addListener(marker, 'click', function() {
      marker.openInfoWindowHtml(html);
    });
  }

  return marker;
}

function gme_redraw_markers() {
  for(var i = 0; i < this.markers.length; i++) {
    this.removeOverlay(this.markers[i][0]);

    var marker;
    if(i == this.current_marker_id) {
      marker = this.create_marker(this.markers[i][1], true);
      this.current_marker = marker;
    } else {
      marker = this.create_marker(this.markers[i][1], false);
    }

    this.addOverlay(marker);
  }
}

function gme_update_forms() {
  if(this.current_marker) {
    var point = this.markers[this.current_marker_id][1].point;

    var lat_field = document.getElementById(this.forms.latitude_field);
    var lng_field = document.getElementById(this.forms.longitude_field);
    var loc_field = document.getElementById(this.forms.location_field);

    lat_field.value = point.lat();
    lng_field.value = point.lng();
    loc_field.innerHTML = point.toString();
  }
}

function gme_on_config_loaded() {
  this.redraw_markers();
  this.update_forms();

  if(this.current_marker) {
    var text = this.markers[this.current_marker_id][1].text;
    document.getElementById(this.forms.text_form).value = text;
  }

  var self = this;
  GEvent.addListener(this, 'click', function(overlay, point) {
    if(overlay == null) {
      self.on_map_clicked(point);
    }
  });
}

function gme_on_map_clicked(point) {
  if(this.current_marker == null) {
    var marker_data = { point: point, text: '' };
    var marker = this.create_marker(marker_data, true);

    this.addOverlay(marker);

    this.markers.push(new Array(marker, marker_data));
    this.current_marker = marker;
    this.current_marker_id = this.markers.length - 1;

    this.update_forms();
  }
}

function gme_on_marker_clicked() {
  var text_form = document.getElementById(this.forms.text_form);
  var html = this.generate_baloon_html(text_form.value);

  this.current_marker.openInfoWindowHtml(html);
}

function gme_on_marker_moved() {
  var point = this.current_marker.getPoint();

  this.markers[this.current_marker_id][1].point = point;
  this.update_forms();
}

function GMapMarkerEditor(id, config, forms, marker_id) {
  var self = new GoogleMap(id, config);

  self.current_marker    = null;
  self.current_marker_id = marker_id;
  self.trackline         = null;
  self.forms             = forms;

  self.create_marker     = gme_create_marker;
  self.redraw_markers    = gme_redraw_markers;
  self.update_forms      = gme_update_forms;
  self.on_config_loaded  = gme_on_config_loaded;
  self.on_map_clicked    = gme_on_map_clicked;
  self.on_marker_clicked = gme_on_marker_clicked;
  self.on_marker_moved   = gme_on_marker_moved;

  return self;
}
