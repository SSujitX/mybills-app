import { registerPlugin } from '@capacitor/core';

const ApkInstaller = registerPlugin('ApkInstaller');

export const installApk = (uri) => ApkInstaller.install({ uri });
