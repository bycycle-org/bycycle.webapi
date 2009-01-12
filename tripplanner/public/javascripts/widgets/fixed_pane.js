/**
 * FixedPane -- A window-like pane that sits in a fixed position.
 *
 * A pane instance has a title on top and can be open, collapsed, or closed.
 */
byCycle.widget.FixedPane = Class.create();
byCycle.widget.FixedPane.prototype = {

  // Default properties
  open: true,
  collapsible: true,
  closeable: true,
  destroy_on_close: false,

  /**
   * @param dom_node The DOM container for this control
   */
  initialize: function (dom_node, opts) {
    $H(opts).each((function (item) {this[item.key] = item.value}).bind(this));
    this.dom_node = $(dom_node);
    this.title_bar = this.dom_node.getElementsByClassName('title-bar')[0];
    this.title = this.title_bar.getElementsByClassName('title')[0].innerHTML;
    this.content_pane = this.dom_node.getElementsByClassName('content-pane')[0];
    this._create_controls();
    !this.open && this.content_pane.hide();
  },

  _create_controls: function () {
    if (!(this.collapsible || this.closeable)) return;
    this.control_bar = this.title_bar.getElementsByClassName('control-bar')[0];
    if (this.collapsible) {
      this._add_button('#toggle-window-contents', 'Hide window content', '_',
                       this.on_collapse);
    }
    if (this.closeable) {
      this._add_button('#close-window', 'Close window', 'X', this.on_close);
    }
  },

  _add_button: function (href, title, text, func) {
    var a = $(document.createElement('a'));
    a.addClassName('button');
    a.href = href;
    a.title = title;
    a.innerHTML = text;
    Event.observe(a, 'click', func.bindAsEventListener(this));
    this.control_bar.appendChild(a);
  },

  on_collapse: function (event) {
    event && Event.stop(event);
    this._run_listeners('collapse');
    this.content_pane.toggle();
  },

  on_close: function (event) {
    event && Event.stop(event);
    this._run_listeners('close');
    this.dom_node.hide();
    this.destroy_on_close && this.destroy();
  },

  destroy: function() {
    this.dom_node.remove();
  },

  /**
   * Register one or more functions to be called back when the event with
   * ``event_name`` is called.
   *
   * TODO: Refactor to Widget superclass?
   */
  register_listeners: function (event_name /*, funcs */) {
    var listeners = this._get_listeners(event_name);
    for (var i = 1; i < arguments.length; ++i) {
      listeners.push(arguments[i]);
    }
  },

  _get_listeners: function (event_name) {
    var list_name = ['on', event_name, 'listeners'].join('_');
    var listeners = this[list_name];
    if (typeof listeners == 'undefined') {
      this[list_name] = [];
      listeners = this[list_name];
    }
    return listeners;
  },

  _run_listeners: function (event_name) {
    var listeners = this._get_listeners(event_name);
    for (var i = 0; i < listeners.length; ++i) {
      listeners[i]();
    }
  }
};
