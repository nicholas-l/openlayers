/**
 * @module ol/control/MousePosition
 */

import {listen} from '../events.js';
import EventType from '../events/EventType.js';
import BaseObject from '../Object.js';
import Control from '../control/Control.js';
import {getTransformFromProjections, identityTransform, get as getProjection} from '../proj.js';


/**
 * @type {string}
 */
const PROJECTION = 'projection';

/**
 * @type {string}
 */
const COORDINATE_FORMAT = 'coordinateFormat';


/**
 * @classdesc
 * A control to show the 2D coordinates of the mouse cursor. By default, these
 * are in the view projection, but can be in any supported projection.
 * By default the control is shown in the top right corner of the map, but this
 * can be changed by using the css selector `.ol-mouse-position`.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.MousePositionOptions=} opt_options Mouse position
 *     options.
 * @api
 */
class MousePosition extends Control {
  constructor(opt_options) {

    const options = opt_options ? opt_options : {};

    const element = document.createElement('DIV');
    element.className = options.className !== undefined ? options.className : 'ol-mouse-position';

    super({
      element: element,
      render: options.render || render,
      target: options.target
    });

    listen(this,
      BaseObject.getChangeEventType(PROJECTION),
      this.handleProjectionChanged_, this);

    if (options.coordinateFormat) {
      this.setCoordinateFormat(options.coordinateFormat);
    }
    if (options.projection) {
      this.setProjection(options.projection);
    }

    /**
     * @private
     * @type {string}
     */
    this.undefinedHTML_ = options.undefinedHTML !== undefined ? options.undefinedHTML : '';

    /**
     * @private
     * @type {string}
     */
    this.renderedHTML_ = element.innerHTML;

    /**
     * @private
     * @type {ol.proj.Projection}
     */
    this.mapProjection_ = null;

    /**
     * @private
     * @type {?ol.TransformFunction}
     */
    this.transform_ = null;

    /**
     * @private
     * @type {ol.Pixel}
     */
    this.lastMouseMovePixel_ = null;

  }

  /**
   * @private
   */
  handleProjectionChanged_() {
    this.transform_ = null;
  }

  /**
   * Return the coordinate format type used to render the current position or
   * undefined.
   * @return {ol.CoordinateFormatType|undefined} The format to render the current
   *     position in.
   * @observable
   * @api
   */
  getCoordinateFormat() {
    return /** @type {ol.CoordinateFormatType|undefined} */ (this.get(COORDINATE_FORMAT));
  }


  /**
   * Return the projection that is used to report the mouse position.
   * @return {ol.proj.Projection|undefined} The projection to report mouse
   *     position in.
   * @observable
   * @api
   */
  getProjection() {
    return /** @type {ol.proj.Projection|undefined} */ (this.get(PROJECTION));
  }


  /**
   * @param {Event} event Browser event.
   * @protected
   */
  handleMouseMove(event) {
    const map = this.getMap();
    this.lastMouseMovePixel_ = map.getEventPixel(event);
    this.updateHTML_(this.lastMouseMovePixel_);
  }


  /**
   * @param {Event} event Browser event.
   * @protected
   */
  handleMouseOut(event) {
    this.updateHTML_(null);
    this.lastMouseMovePixel_ = null;
  }


  /**
   * @inheritDoc
   * @api
   */
  setMap(map) {
    super.setMap(map);
    if (map) {
      const viewport = map.getViewport();
      this.listenerKeys.push(
        listen(viewport, EventType.MOUSEMOVE,
          this.handleMouseMove, this),
        listen(viewport, EventType.MOUSEOUT,
          this.handleMouseOut, this)
      );
    }
  }


  /**
   * Set the coordinate format type used to render the current position.
   * @param {ol.CoordinateFormatType} format The format to render the current
   *     position in.
   * @observable
   * @api
   */
  setCoordinateFormat(format) {
    this.set(COORDINATE_FORMAT, format);
  }


  /**
   * Set the projection that is used to report the mouse position.
   * @param {ol.ProjectionLike} projection The projection to report mouse
   *     position in.
   * @observable
   * @api
   */
  setProjection(projection) {
    this.set(PROJECTION, getProjection(projection));
  }


  /**
   * @param {?ol.Pixel} pixel Pixel.
   * @private
   */
  updateHTML_(pixel) {
    let html = this.undefinedHTML_;
    if (pixel && this.mapProjection_) {
      if (!this.transform_) {
        const projection = this.getProjection();
        if (projection) {
          this.transform_ = getTransformFromProjections(
            this.mapProjection_, projection);
        } else {
          this.transform_ = identityTransform;
        }
      }
      const map = this.getMap();
      const coordinate = map.getCoordinateFromPixel(pixel);
      if (coordinate) {
        this.transform_(coordinate, coordinate);
        const coordinateFormat = this.getCoordinateFormat();
        if (coordinateFormat) {
          html = coordinateFormat(coordinate);
        } else {
          html = coordinate.toString();
        }
      }
    }
    if (!this.renderedHTML_ || html != this.renderedHTML_) {
      this.element.innerHTML = html;
      this.renderedHTML_ = html;
    }
  }
}


/**
 * Update the mouseposition element.
 * @param {ol.MapEvent} mapEvent Map event.
 * @this {ol.control.MousePosition}
 * @api
 */
export function render(mapEvent) {
  const frameState = mapEvent.frameState;
  if (!frameState) {
    this.mapProjection_ = null;
  } else {
    if (this.mapProjection_ != frameState.viewState.projection) {
      this.mapProjection_ = frameState.viewState.projection;
      this.transform_ = null;
    }
  }
  this.updateHTML_(this.lastMouseMovePixel_);
}

export default MousePosition;
