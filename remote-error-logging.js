import Ember from 'ember';
import ENV from '../config/environment';

export function initialize(/* application */) {
    // log errors to backend for production environment.
    if (ENV.environment === 'off') {
        Ember.onerror = function(error) {
            Ember.$.ajax(ENV.apiHost + '/errors', {
                dataType: 'json',
                type: 'POST',
                data: {
                    stacktrace: error.stack,
                    message: 'Exception occurred in AMD PRODUCTION ENV'
                }
            });
        };
    }
}

export default {
    name: 'remote-error-logging',
    initialize
};
