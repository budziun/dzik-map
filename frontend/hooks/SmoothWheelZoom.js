/* eslint-disable */
(function (factory) {
    typeof define === 'function' && define.amd ? define(['leaflet'], factory) :
        typeof exports === 'object' ? factory(require('leaflet')) :
            factory(L);
}(function (L) {
    L.Map.SmoothWheelZoom = L.Handler.extend({
        addHooks: function () {
            L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this);
        },
        removeHooks: function () {
            L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this);
        },
        _onWheelScroll: function (e) {
            if (!this._isWheeling) {
                this._onWheelStart(e);
            }
            this._onWheeling(e);
        },
        _onWheelStart: function (e) {
            var map = this._map;
            this._isWheeling = true;
            this._wheelMousePosition = map.mouseEventToContainerPoint(e);
            this._centerPoint = map.getSize()._divideBy(2);
            this._startLatLng = map.containerPointToLatLng(this._centerPoint);
            this._wheelStartLatLng = map.containerPointToLatLng(this._wheelMousePosition);
            this._startZoom = map.getZoom();
            this._moved = false;
            this._zooming = true;
            map._stop();
            if (map._panAnim) map._panAnim.stop();
            this._goalZoom = map.getZoom();
            this._prevCenter = map.getCenter();
            this._prevZoom = map.getZoom();
            this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
        },
        _onWheeling: function (e) {
            var map = this._map;
            this._goalZoom = this._goalZoom - e.deltaY * 0.003 * (map.options.smoothSensitivity || 1);
            if (this._goalZoom < map.getMinZoom()) {
                this._goalZoom = map.getMinZoom();
            } else if (this._goalZoom > map.getMaxZoom()) {
                this._goalZoom = map.getMaxZoom();
            }
            this._wheelMousePosition = this._map.mouseEventToContainerPoint(e);
            clearTimeout(this._timeoutId);
            this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200);
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
        },
        _updateWheelZoom: function () {
            var map = this._map;
            if (!map.getContainer().ownerDocument.contains(map.getContainer())) return;
            this._goalZoom = Math.round(this._goalZoom * 100) / 100;
            var targetZoom = this._goalZoom;
            var currentZoom = map.getZoom();
            var newZoom = currentZoom + (targetZoom - currentZoom) * 0.2;
            newZoom = Math.round(newZoom * 100) / 100;
            var delta = this._wheelMousePosition.subtract(this._centerPoint);
            if (delta.x === 0 && delta.y === 0) {
                this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
                return;
            }
            map._animateZoom(
                map.containerPointToLatLng(this._centerPoint),
                newZoom,
                true,
                true
            );
            this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
        },
        _onWheelEnd: function () {
            this._isWheeling = false;
            cancelAnimationFrame(this._zoomAnimationId);
            this._map.setZoom(this._goalZoom);
        }
    });
    L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom);
}));