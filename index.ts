import { registerRootComponent } from 'expo';

import App from './App';
import { registerNativeCallBackgroundTask } from './src/services/native-calls';
import { registerLiveKitGlobals } from './src/services/register-livekit';

registerLiveKitGlobals();
void registerNativeCallBackgroundTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
