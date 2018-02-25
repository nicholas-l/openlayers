/**
 * @module ol/control/Zoom
 */
import {listen} from '../events.js';
import EventType from '../events/EventType.js';
import Control from '../control/Control.js';
import {CLASS_CONTROL, CLASS_UNSELECTABLE} from '../css.js';
import {easeOut} from '../easing.js';

/**
 * @classdesc
 * A control with 2 buttons, one for zoom in and one for zoom out.
 * This control is one of the default controls of a map. To style this control
 * use css selectors `.ol-zoom-in` and `.ol-zoom-out`.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ZoomOptions=} opt_options Zoom options.
 * @api
 */
class Zoom extends Control {
  constructor(opt_options) {

    const options = opt_options ? opt_options : {};

    const className = options.className !== undefined ? options.className : 'ol-zoom';

    const delta = options.delta !== undefined ? options.delta : 1;

    const zoomInLabel = options.zoomInLabel !== undefined ? options.zoomInLabel : '+';
    const zoomOutLabel = options.zoomOutLabel !== undefined ? options.zoomOutLabel : '\u2212';

    const zoomInTipLabel = options.zoomInTipLabel !== undefined ?
      options.zoomInTipLabel : 'Zoom in';
    const zoomOutTipLabel = options.zoomOutTipLabel !== undefined ?
      options.zoomOutTipLabel : 'Zoom out';

    const inElement = document.createElement('button');
    inElement.className = className + '-in';
    inElement.setAttribute('type', 'button');
    inElement.title = zoomInTipLabel;
    inElement.appendChild(
      typeof zoomInLabel === 'string' ? document.createTextNode(zoomInLabel) : zoomInLabel
    );

    listen(inElement, EventType.CLICK, (event) => this.handleClick_(delta, event));

    const outElement = document.createElement('button');
    outElement.className = className + '-out';
    outElement.setAttribute('type', 'button');
    outElement.title = zoomOutTipLabel;
    outElement.appendChild(
      typeof zoomOutLabel === 'string' ? document.createTextNode(zoomOutLabel) : zoomOutLabel
    );

    listen(outElement, EventType.CLICK, (event) => this.handleClick_(-delta, event));

    const cssClasses = className + ' ' + CLASS_UNSELECTABLE + ' ' + CLASS_CONTROL;
    const element = document.createElement('div');
    element.className = cssClasses;
    element.appendChild(inElement);
    element.appendChild(outElement);

    super({
      element: element,
      target: options.target
    });

    /**
     * @type {number}
     * @private
     */
    this.duration_ = options.duration !== undefined ? options.duration : 250;

  }


  /**
   * @param {number} delta Zoom delta.
   * @param {Event} event The event to handle
   * @private
   */
  handleClick_(delta, event) {
    event.preventDefault();
    this.zoomByDelta_(delta);
  }


  /**
   * @param {number} delta Zoom delta.
   * @private
   */
  zoomByDelta_(delta) {
    const map = this.getMap();
    const view = map.getView();
    if (!view) {
      // the map does not have a view, so we can't act
      // upon it
      return;
    }
    const currentResolution = view.getResolution();
    if (currentResolution) {
      const newResolution = view.constrainResolution(currentResolution, delta);
      if (this.duration_ > 0) {
        if (view.getAnimating()) {
          view.cancelAnimations();
        }
        view.animate({
          resolution: newResolution,
          duration: this.duration_,
          easing: easeOut
        });
      } else {
        view.setResolution(newResolution);
      }
    }
  }
}
export default Zoom;
