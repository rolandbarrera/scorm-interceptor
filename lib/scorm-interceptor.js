(function(window) {
  if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function assign(target, varArgs) { // .length of function is 2
        'use strict';
        if (target == null) { // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object');
        }
  
        var to = Object(target);
  
        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];
  
          if (nextSource != null) { // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true
    });
  }
  
  var scormInterceptor = {
    config: {
      // xapi LRS configuration 
      lrs: {
        endpoint: '', 
        username: '', // Username to use for auth
        password: '', // Password to use for atuh
        authKey: ''   // Auth key (use in place of username/password)
      },
      // xapi configuration 
      xapi: {
        courseName: 'DEFAULT_COURSE',
        verbs: {
          defaultVerb: 'interacted',
          map: {
            'cmi.suspend_data': 'interacted'
          }
        },
        agent: {
          defaultAgent: {
            id: 'DEFAULT_AGENT_ID',
            name: 'DEFAULT_AGENT_NAME'
          }
        }
      },
      // scorm configuration
      scorm: {
        setValueFunction: 'SCORM_CallLMSSetValue',
        api: 'SCORM_objAPI'
      },
      debug: false // Output debug information
    },
    lrsEnabled: false,
    statements: [],

    /**
     * Initialize the converter with the specified configuration
     * @param {Object} config
     * 
     */
    init: function(config) {
      this.config = mergeDeep(this.config, config);

      init();
    }
  };
  
  /**
   * initialize all handlers
   */
  function init() {
    var numTries = 10;

    // Load LRS settings
    initLRS();

    // Attempt to intercept the scorm set value function
    var token = setInterval(function() {
      var result = false;

      if (numTries-- > 0) {
        result = interceptScormSetValue();
        if (result) {
          clearInterval(token);
          log('SCORM function to intercept found.');
        }
      } else {
        clearInterval(token);
        log('Cannot find SCORM function for interception. You may need to reconfigure your scorm settings.')
      }
    }, 500);
  }
  
  /**
   * Initialize the LRS so we can send xapi statements to it
   */
  function initLRS() {
    var config = scormInterceptor.config;
    var lrs = config.lrs;

    log('Initializing LRS endpoint.');

    if (lrs.endpoint) {
      var conf = {
        endpoint: lrs.endpoint
      };

      if (lrs.username && lrs.password) {
        conf.user = lrs.username;
        conf.password = lrs.password;
      } else {
        conf.auth = 'Basic ' +  lrs.authKey;
      }

      ADL.XAPIWrapper.changeConfig(conf);

      scormInterceptor.lrsEnabled = true;
    }

    log('Initializing LRS endpoint complete.')
  }

  /**
   * Get the xapi actor from the scorm API
   */
  function getActor() {
    var config = scormInterceptor.config;
    var defaultUser = config.xapi.agent.defaultAgent;
    var scormApi = window[config.scorm.api];

    var name = (scormApi && scormApi.LearnerName) ? scormApi.LearnerName : defaultUser.name;
    var id = (scormApi && scormApi.LearnerId) ? scormApi.LearnerId : defaultUser.id;
    if (validateEmail(id)) {
      id = 'mailto:' + id;
    } else {
      id = 'mailto:' + (defaultUser.email || 'fromScormInterceptor@riptidesoftware.com');
    }

    return new ADL.XAPIStatement.Agent(
      id,
      name
    );
  }

  /**
   * Get the xapi verb from the scorm API
   * @param {string} element 
   */
  function getVerb(element) {
    var verb = 
      scormInterceptor.config.xapi.verbs.map[element] ||
      scormInterceptor.config.xapi.verbs.defaultVerb ||
      'interacted';

    return ADL.verbs[verb];
  }

  /**
   * Get the xapi activity from the scorm API
   * @param {string} element 
   * @param {string} value 
   */
  function getActivity(element, value) {
    var config = scormInterceptor.config;
    var id = location.origin + '/course/' + config.xapi.courseName;

    var activity = new ADL.XAPIStatement.Activity(
      id,
      'Scorm Interception',
      'A scorm value was intercepted'
    );

    return activity;
  }

  /**
   * Convert a scorm statement into a valid xapi statement
   * @param {string} element 
   * @param {string} value 
   */
  function scormToxApi(element, value) {
    var statement = new ADL.XAPIStatement(
      getActor(),
      getVerb(element),
      getActivity(element, value)
    );

    // Add scorm context
    var baseContext = location.origin + '/';
    statement.context = {
      extensions: { 
        [baseContext + 'element']: element,
        [baseContext + 'value']: value
      }
    }

    // Send the statement off to the lrs
    if (scormInterceptor.lrsEnabled) {
      statement.generateId();

      log('Sending xAPI statement to LRS: ', statement);
      ADL.XAPIWrapper.sendStatements([statement], function() { return null; });
    }
  }

  /**
   * Override the set value function that sends scorm statements
   */
  function interceptScormSetValue() {
    log('Attempting to intercept the SCORM set value function');
    var self = this;

    var setValueFunctionName = scormInterceptor.config.scorm.setValueFunction;
    var original_SCORM_CallLMSSetValue = window[setValueFunctionName];

    if (!original_SCORM_CallLMSSetValue) {
      log('Could not find set value SCORM function');
      return false;
    }

    log('SCORM set value function found. Setting up interception.');
    window[setValueFunctionName] = function(strElement, strValue) {
      // Run the original function
      original_SCORM_CallLMSSetValue(strElement, strValue);

      // Generate and persist an xapi statement based off this value
      setTimeout(function() {
        scormToxApi(strElement, strValue);
      }, 50)
    }
    log('SCORM set value interception complete.');

    return true;
  }

  /*************   HELPERS  **************/

  function log(message, data) {
    if (scormInterceptor.config.debug) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
  
  /**
   * Determine if a string is a valid email
   */
  function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }
  
  /**
   * Simple object check.
   * @param item
   * @returns {boolean}
   */
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
  function mergeDeep(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(function(key) {
        if (isObject(source[key])) {
          if (!(key in target)) {
            var obj = { };
            obj[key] = source[key];
            Object.assign(output, obj);
          }
          else
            output[key] = mergeDeep(target[key], source[key]);
        } else {
          var obj = { };
          obj[key] = source[key];
          Object.assign(output, obj);
        }
      });
    }
    return output;
  }

  window.scormInterceptor = scormInterceptor;
})(window);