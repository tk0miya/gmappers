
function parse_config(config)
{
  var self = this;

  if(config == null) {
    config = this.config;
  }

  var request = GXmlHttp.create();
  request.open("GET", config, true);
  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      var xmldoc = request.responseXML;
      var root = xmldoc.documentElement;

      if(root) {
        self.parse_config_sub(root);
        self.on_config_loaded();
      } else {
        alert("Failed to load config file");
      }
    }
  }
  request.send(null);
}

function parse_config_sub(config)
{
  for(var i = 0; i < config.childNodes.length; i++) {
    var node = config.childNodes[i];
    var name = node.nodeName;

    if(name == "Option") {
      this.config_option_handler(node);
    } else if(name == "Controls") {
      this.config_controls_handler(node);
    } else if(name == "Overlay") {
      var type = node.getAttribute("type");

      if(type == "marker") {
        this.config_marker_handler(node);
      } else if(type == "polyline") {
        this.config_polyline_handler(node);
      } else if(type == "encoded_polyline") {
        this.config_encoded_polyline_handler(node);
      }
    }
  }

  this.do_centering();
}

function config_option_handler(config)
{
  var lat = parseFloat(config.getAttribute("lat"));
  var lng = parseFloat(config.getAttribute("lng"));
  if(lat && lng) {
    var zoom = parseInt(config.getAttribute("zoom"));

    if(zoom) {
      this.setCenter(new GLatLng(lat, lng), zoom);
    } else {
      this.setCenter(new GLatLng(lat, lng));
    }
  }

  var enableDoubleClickZoom = config.getAttribute("enableDoubleClickZoom");
  if(enableDoubleClickZoom == "true") {
    this.enableDoubleClickZoom();
  }

  var enableContinuousZoom = config.getAttribute("enableContinuousZoom");
  if(enableContinuousZoom == "true") {
    this.enableContinuousZoom();
  }

  var useGKeyboardHanlder = config.getAttribute("useGKeyboardHandler");
  if(useGKeyboardHanlder == "true") {
    new GKeyboardHandler(this);
  }

  var autoCentering = config.getAttribute("autoCentering");
  if(autoCentering == "true") {
    this.auto_centering = true;
  }

  var useGeocoder = config.getAttribute("useGeocoder");
  if(useGeocoder == "true") {
    this.geocoder = new GClientGeocoder();
  }
}

function config_controls_handler(config)
{
  var controls = config.getElementsByTagName("Control");

  for(var i = 0; i < controls.length; i++) {
    var name = controls[i].getAttribute("name");

    var ctrl = eval("new " + name + "()");
    this.addControl(ctrl);
  }
}

function config_marker_handler(config)
{
  var point = config.getElementsByTagName("GLatLng")[0];
  var geocode = config.getElementsByTagName("Geocode")[0];
  var textnode = config.getElementsByTagName("Text")[0];

  var text;
  if(textnode && textnode.firstChild) {
    text = textnode.firstChild.nodeValue;
  } else {
    text = '';
  }

  if(geocode && this.geocoder) {
    var self = this;
    var address = geocode.getAttribute("address");

    self.geocoder_count++;
    this.geocoder.getLatLng(address, function(point) {
      if(point) {
        self.config_marker_handler_sub(point, text);
      } else {
        alert(address + " is not found");
      }

      if(self.geocoder_count-- == 0) {
        self.do_centering();
      }
    });
  } else {
    var lat = parseFloat(point.getAttribute("lat"));
    var lng = parseFloat(point.getAttribute("lng"));

    var point = new GLatLng(lat, lng);
    this.config_marker_handler_sub(point, text);
  }
}

function config_marker_handler_sub(point, text) {
  this.register_point(point);

  var marker = new GMarker(point);
  this.addOverlay(marker);

  this.markers.push(new Array(marker, { point: point, text: text }));

  if(text != "") {
    var html = this.generate_baloon_html(text);
    GEvent.addListener(marker, 'click', function() {
      marker.openInfoWindowHtml(html);
    });
  }
}

function generate_baloon_html(text) {
  html = escape_html(text);
  html = html.replace(/\n/ig, '<br />');
  html = html.replace(/__(.*)__/ig, '<b>$1</b>');
  html = html.replace(/(s?https?:\/\/[-_.!~*'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)/g,
                      '<a href="$1" target="_blank">$1</a>');
  return html;
}

function config_polyline_handler(config)
{
  var color = config.getAttribute("color");
  var array = config.getElementsByTagName("GLatLng");

  var points = new Array();
  for(var i = 0; i < array.length; i++) {
    var lat = parseFloat(array[i].getAttribute("lat"));
    var lng = parseFloat(array[i].getAttribute("lng"));

    var point = new GLatLng(lat, lng);
    this.register_point(point);

    points.push(point);
  }

  encoded_data = this.encode_polyline_data(points, color);

  var polyline = new GPolyline.fromEncoded(encoded_data);
  this.addOverlay(polyline);
  this.polylines.push(new Array(polyline, encoded_data));
}

function config_encoded_polyline_handler(config)
{
  var encoded = { "points" : "", "levels" : "", "color" : "",
                  "zoomFactor" : 16, "numLevels" : 4 };

  encoded.points = config.getAttribute("points");
  encoded.levels = config.getAttribute("levels");
  encoded.color  = config.getAttribute("color");

  this.register_polyline(encoded.points);

  var polyline = new GPolyline.fromEncoded(encoded);
  this.addOverlay(polyline);
  this.polylines.push(new Array(polyline, encoded));
}

// Ref: http://hwat.sakura.ne.jp/hpod/200609/14-200000/
function encode_polyline_data(points, color)
{
  var encoded = { "points" : "", "levels" : "", "color" : "",
                  "zoomFactor" : 16, "numLevels" : 4 };

  if(points.length == 0) {
    return encoded;
  }

  // Last processed location in each level
  var last_point_1 = points[0];
  var last_point_2 = points[0];
  var last_point_3 = points[0];


  var plat = 0;
  var plng = 0;
  for(var i = 0; i < points.length; i++) {
    var level = 0;
    var point = points[i];

    if(i == 0 || i == points.length - 1) {
      // Set first item and last item to level 3.
      level = 3;
    } else {
      // Level 1 update (each 2 km)
      if(2 * 1000 < point.distanceFrom(last_point_1)) {
        level = 1;
        last_point_1 = point;
      }

      // Level 2 update (each 10 km)
      if(10 * 1000 < point.distanceFrom(last_point_2)) {
        level = 2;
        last_point_2 = point;
      }

      // Level 3 update (each 100 km)
      if(100 * 1000 < point.distanceFrom(last_point_3)) {
        level = 3;
        last_point_3 = point;
      }
    }
 
    // encode
    var late5 = Math.floor(point.lat() * 1e5);
    var lnge5 = Math.floor(point.lng() * 1e5);

    dlat = late5 - plat;
    dlng = lnge5 - plng;
    plat = late5;
    plng = lnge5;

    encoded.points += this.encodeSignedNumber(dlat) +
                      this.encodeSignedNumber(dlng);
    encoded.levels += this.encodeNumber(level);
  }

  encoded.color = color;

  return encoded;
}

function encodeSignedNumber(num) {
  var sgn_num = num << 1;

  if (num < 0) {
    sgn_num = ~(sgn_num);
  }

  return(encodeNumber(sgn_num));
}

function encodeNumber(num) {
  var encodeString = "";

  while (num >= 0x20) {
    encodeString += (String.fromCharCode((0x20 | (num & 0x1f)) + 63));
    num >>= 5;
  }

  encodeString += (String.fromCharCode(num + 63));
  return encodeString;
}

function decodeLine (encoded) {
  var len = encoded.length;
  var index = 0;
  var array = [];
  var lat = 0;
  var lng = 0;

  while (index < len) {
    var b;
    var shift = 0;
    var result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    array.push(new GLatLng(lat * 1e-5, lng * 1e-5));
  }

  return array;
}

function register_point(point) {
  if(this.auto_centering) {
    if(this.draw_bounds) {
       this.draw_bounds.extend(point);
    } else {
       this.draw_bounds = new GLatLngBounds(point, point);
    }
  }
}

function register_polyline(encoded_points) {
  if(this.auto_centering) {
    var points = this.decodeLine(encoded_points);

    for(var i = 0; i < points.length; i++) {
      this.register_point(points[i]);
    }
  }
}

function do_centering() {
  if(this.auto_centering && this.draw_bounds) {
    var center = this.draw_bounds.getCenter();
    var zoom = this.getBoundsZoomLevel(this.draw_bounds);

    this.setCenter(center, zoom);
  }
}

function reload_config() {
  this.clearOverlays();
  this.polylines = new Array();
  this.markers = new Array();
  this.parse_config();
}

function on_config_loaded() {
}


function GoogleMap(id, config) {
  var self = new GMap2(document.getElementById(id));

  self.config         = config || "config.xml";
  self.markers        = new Array();
  self.polylines      = new Array();
  self.geocoder       = null;
  self.geocoder_count = 0;

  self.parse_config                    = parse_config;
  self.parse_config_sub                = parse_config_sub;
  self.reload_config                   = reload_config;
  self.config_option_handler           = config_option_handler;
  self.config_controls_handler         = config_controls_handler;
  self.config_marker_handler           = config_marker_handler;
  self.config_marker_handler_sub       = config_marker_handler_sub;
  self.config_polyline_handler         = config_polyline_handler;
  self.config_encoded_polyline_handler = config_encoded_polyline_handler;
  self.generate_baloon_html            = generate_baloon_html;
  self.encode_polyline_data            = encode_polyline_data;
  self.encodeSignedNumber              = encodeSignedNumber;
  self.encodeNumber                    = encodeNumber;
  self.decodeLine                      = decodeLine;
  self.auto_centering                  = false;
  self.do_centering                    = do_centering;
  self.register_point                  = register_point;
  self.register_polyline               = register_polyline;
  self.on_config_loaded                = on_config_loaded;

//  self.setCenter(new GLatLng(0, 0), 1);
  self.setCenter(new GLatLng(35.65951, 139.701247), 9);
  self.parse_config();

  return self;
}

function escape_html(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
