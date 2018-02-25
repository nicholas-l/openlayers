/**
 * @module ol/control/ZoomToExtent
 */
import {listen} from '../events.js';
import EventType from '../events/EventType.js';
import Control from '../control/Control.js';
import {CLASS_CONTROL, CLASS_UNSELECTABLE} from '../css.js';

/**
 * @classdesc
 * A button control which, when pressed, changes the map view to a specific
 * extent. To style this control use the css selector `.ol-zoom-extent`.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ZoomToExtentOptions=} opt_options Options.
 * @api
 */
class ZoomToExtent extends Control {
  constructor(opt_options) {
    const options = opt_options ? opt_options : {};

    const className = options.className !== undefined ? options.className :
      'ol-zoom-extent';

    const label = options.label !== undefined ? options.label : 'E';
    const tipLabel = options.tipLabel !== undefined ?
      options.tipLabel : 'Fit to extent';
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.title = tipLabel;
    button.appendChild(
      typeof label === 'string' ? document.createTextNode(label) : label
    );

    const cssClasses = className + ' ' + CLASS_UNSELECTABLE + ' ' + CLASS_CONTROL;
    const element = document.createElement('div');
    element.className = cssClasses;
    element.appendChild(button);

    super({
      element: element,
      target: options.target
    });
    /**
     * @type {ol.Extent}
     * @protected
     */
    this.extent = options.extent ? options.extent : null;

    listen(button, EventType.CLICK,
      this.handleClick_, this);
  };



  /**
   * @param {Event} event The event to handle
   * @private
   */
  handleClick_(event) {
    event.preventDefault();
    this.handleZoomToExtent();
  };


  /**
   * @protected
   */
  handleZoomToExtent() {
    const map = this.getMap();
    const view = map.getView();
    const extent = !this.extent ? view.getProjection().getExtent() : this.extent;
    view.fit(extent);
  };
}
export default ZoomToExtent;
