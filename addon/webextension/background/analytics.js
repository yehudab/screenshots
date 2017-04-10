/* globals main, auth, catcher, deviceInfo, communication */

window.analytics = (function () {
  let exports = {};

  let telemetryPrefKnown = false;
  let telemetryPref;

  exports.sendEvent = function (action, label, options) {
    let eventCategory = "addon";
    if (! telemetryPrefKnown) {
      console.warn("sendEvent called before we were able to refresh");
      return Promise.resolve();
    }
    if (! telemetryPref) {
      console.info(`Cancelled sendEvent ${eventCategory}/${action}/${label || 'none'} ${JSON.stringify(options)}`);
      return Promise.resolve();
    }
    if (typeof label == "object" && (! options)) {
      options = label;
      label = undefined;
    }
    options = options || {};
    let di = deviceInfo();
    let url = main.getBackend() + "/event";
    options.applicationName = di.appName;
    options.applicationVersion = di.version;
    let abTests = auth.getAbTests();
    for (let testName in abTests) {
      options[abTests[testName].gaField] = abTests[testName].value;
    }
    console.info(`sendEvent ${eventCategory}/${action}/${label || 'none'} ${JSON.stringify(options)}`);
    let req = new Request(url, {
      method: "POST",
      mode: "cors",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        deviceId: auth.getDeviceId(),
        event: eventCategory,
        action,
        label,
        options
      })
    });
    return fetch(req).then((resp) => {
      if (! resp.ok) {
        throw new Error(`Error in sendEvent response: ${resp.status}`);
      }
    }).catch((error) => {
      // sendEvent is fire-and-forget, so this console.warn is the best we have
      console.warn("Error in sendEvent response:", error);
    });
  };

  exports.refreshTelemetryPref = function () {
    return communication.sendToBootstrap("getTelemetryPref").then((result) => {
      telemetryPrefKnown = true;
      if (result === communication.NO_BOOTSTRAP) {
        telemetryPref = true;
      } else {
        telemetryPref = result;
      }
    }, (error) => {
      // If there's an error reading the pref, we should assume that we shouldn't send data
      telemetryPrefKnown = true;
      telemetryPref = false;
      throw error;
    });
  };

  exports.getTelemetryPrefSync = function() {
    catcher.watchPromise(exports.refreshTelemetryPref());
    return !!telemetryPref;
  };

  return exports;
})();
