const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withConfiaAndroidCalls(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const app = manifestConfig.modResults.manifest.application?.[0];

    if (!app) {
      return manifestConfig;
    }

    app.service = app.service ?? [];

    const serviceName = 'io.wazo.callkeep.VoiceConnectionService';
    const hasService = app.service.some((service) => service.$?.['android:name'] === serviceName);

    if (!hasService) {
      app.service.push({
        $: {
          'android:exported': 'true',
          'android:foregroundServiceType': 'phoneCall|microphone',
          'android:label': '@string/app_name',
          'android:name': serviceName,
          'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.telecom.ConnectionService',
                },
              },
            ],
          },
        ],
      });
    }

    return manifestConfig;
  });
};
