/**
 * @module ol/control/Attribution
 */
import {equals} from '../array.js';
import Control from '../control/Control.js';
import {CLASS_CONTROL, CLASS_UNSELECTABLE, CLASS_COLLAPSED} from '../css.js';
import {removeChildren, replaceNode} from '../dom.js';
import {listen} from '../events.js';
import EventType from '../events/EventType.js';
import {visibleAtResolution} from '../layer/Layer.js';

/**
 * @classdesc
 * Control to show all the attributions associated with the layer sources
 * in the map. This control is one of the default controls included in maps.
 * By default it will show in the bottom right portion of the map, but this can
 * be changed by using a css selector for `.ol-attribution`.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.AttributionOptions=} opt_options Attribution options.
 * @api
 */
class Attribution extends Control {
  constructor(opt_options) {

    const options = opt_options ? opt_options : {};

    /**
     * @private
     * @type {Element}
     */
    const ulElement_ = document.createElement('UL');

    /**
     * @private
     * @type {boolean}
     */
    let collapsed_ = options.collapsed !== undefined ? options.collapsed : true;

    /**
     * @private
     * @type {boolean}
     */
    const collapsible_ = options.collapsible !== undefined ?
      options.collapsible : true;

    if (!collapsible_) {
      collapsed_ = false;
    }

    const className = options.className !== undefined ? options.className : 'ol-attribution';

    const tipLabel = options.tipLabel !== undefined ? options.tipLabel : 'Attributions';

    const collapseLabel = options.collapseLabel !== undefined ? options.collapseLabel : '\u00BB';
    let collapseLabel_;

    if (typeof collapseLabel === 'string') {
      /**
       * @private
       * @type {Node}
       */
      collapseLabel_ = document.createElement('span');
      collapseLabel_.textContent = collapseLabel;
    } else {
      collapseLabel_ = collapseLabel;
    }

    const label = options.label !== undefined ? options.label : 'i';
    let label_;

    if (typeof label === 'string') {
      /**
       * @private
       * @type {Node}
       */
      label_ = document.createElement('span');
      label_.textContent = label;
    } else {
      label_ = label;
    }


    const activeLabel = (collapsible_ && !collapsed_) ?
      collapseLabel_ : label_;
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.title = tipLabel;
    button.appendChild(activeLabel);

    listen(button, EventType.CLICK, (event) => this.handleClick_(event));

    const cssClasses = className + ' ' + CLASS_UNSELECTABLE + ' ' + CLASS_CONTROL +
        (collapsed_ && collapsible_ ? ' ' + CLASS_COLLAPSED : '') +
        (collapsible_ ? '' : ' ol-uncollapsible');
    const element = document.createElement('div');
    element.className = cssClasses;
    element.appendChild(ulElement_);
    element.appendChild(button);

    super({
      element: element,
      render: options.render || render,
      target: options.target
    });
    this.collapsible_ = collapsible_;
    this.collapsed_ = collapsed_;
    this.collapseLabel_ = collapseLabel_;
    this.label_ = label_;
    this.ulElement_ = this.ulElement_;
    /**
     * A list of currently rendered resolutions.
     * @type {Array.<string>}
     * @private
     */
    this.renderedAttributions_ = [];

    /**
     * @private
     * @type {boolean}
     */
    this.renderedVisible_ = true;

  }


  /**
   * Get a list of visible attributions.
   * @param {olx.FrameState} frameState Frame state.
   * @return {Array.<string>} Attributions.
   * @private
   */
  getSourceAttributions_(frameState) {
    /**
     * Used to determine if an attribution already exists.
     * @type {Object.<string, boolean>}
     */
    const lookup = {};

    /**
     * A list of visible attributions.
     * @type {Array.<string>}
     */
    const visibleAttributions = [];

    const layerStatesArray = frameState.layerStatesArray;
    const resolution = frameState.viewState.resolution;
    for (let i = 0, ii = layerStatesArray.length; i < ii; ++i) {
      const layerState = layerStatesArray[i];
      if (!visibleAtResolution(layerState, resolution)) {
        continue;
      }

      const source = layerState.layer.getSource();
      if (!source) {
        continue;
      }

      const attributionGetter = source.getAttributions();
      if (!attributionGetter) {
        continue;
      }

      const attributions = attributionGetter(frameState);
      if (!attributions) {
        continue;
      }

      if (Array.isArray(attributions)) {
        for (let j = 0, jj = attributions.length; j < jj; ++j) {
          if (!(attributions[j] in lookup)) {
            visibleAttributions.push(attributions[j]);
            lookup[attributions[j]] = true;
          }
        }
      } else {
        if (!(attributions in lookup)) {
          visibleAttributions.push(attributions);
          lookup[attributions] = true;
        }
      }
    }
    return visibleAttributions;
  }
}


/**
 * Update the attribution element.
 * @param {ol.MapEvent} mapEvent Map event.
 * @this {ol.control.Attribution}
 * @api
 */
export function render(mapEvent) {
  this.updateElement_(mapEvent.frameState);
}


/**
 * @private
 * @param {?olx.FrameState} frameState Frame state.
 */
Attribution.prototype.updateElement_ = function(frameState) {
  if (!frameState) {
    if (this.renderedVisible_) {
      this.element.style.display = 'none';
      this.renderedVisible_ = false;
    }
    return;
  }

  const attributions = this.getSourceAttributions_(frameState);
  if (equals(attributions, this.renderedAttributions_)) {
    return;
  }

  removeChildren(this.ulElement_);

  // append the attributions
  for (let i = 0, ii = attributions.length; i < ii; ++i) {
    const element = document.createElement('LI');
    element.innerHTML = attributions[i];
    this.ulElement_.appendChild(element);
  }


  const visible = attributions.length > 0;
  if (this.renderedVisible_ != visible) {
    this.element.style.display = visible ? '' : 'none';
    this.renderedVisible_ = visible;
  }

  this.renderedAttributions_ = attributions;
};


/**
 * @param {Event} event The event to handle
 * @private
 */
Attribution.prototype.handleClick_ = function(event) {
  event.preventDefault();
  this.handleToggle_();
};


/**
 * @private
 */
Attribution.prototype.handleToggle_ = function() {
  this.element.classList.toggle(CLASS_COLLAPSED);
  if (this.collapsed_) {
    replaceNode(this.collapseLabel_, this.label_);
  } else {
    replaceNode(this.label_, this.collapseLabel_);
  }
  this.collapsed_ = !this.collapsed_;
};


/**
 * Return `true` if the attribution is collapsible, `false` otherwise.
 * @return {boolean} True if the widget is collapsible.
 * @api
 */
Attribution.prototype.getCollapsible = function() {
  return this.collapsible_;
};


/**
 * Set whether the attribution should be collapsible.
 * @param {boolean} collapsible True if the widget is collapsible.
 * @api
 */
Attribution.prototype.setCollapsible = function(collapsible) {
  if (this.collapsible_ === collapsible) {
    return;
  }
  this.collapsible_ = collapsible;
  this.element.classList.toggle('ol-uncollapsible');
  if (!collapsible && this.collapsed_) {
    this.handleToggle_();
  }
};


/**
 * Collapse or expand the attribution according to the passed parameter. Will
 * not do anything if the attribution isn't collapsible or if the current
 * collapsed state is already the one requested.
 * @param {boolean} collapsed True if the widget is collapsed.
 * @api
 */
Attribution.prototype.setCollapsed = function(collapsed) {
  if (!this.collapsible_ || this.collapsed_ === collapsed) {
    return;
  }
  this.handleToggle_();
};


/**
 * Return `true` when the attribution is currently collapsed or `false`
 * otherwise.
 * @return {boolean} True if the widget is collapsed.
 * @api
 */
Attribution.prototype.getCollapsed = function() {
  return this.collapsed_;
};
export default Attribution;
