function fill_edit_key(map_id) {
  var edit_form = document.forms["edit_map_" + map_id];
  var delete_form = document.forms["delete_map_" + map_id];

  delete_form.edit_key.value = edit_form.edit_key.value;
}
