package com.mybills.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.List;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {
    @PluginMethod
    public void install(PluginCall call) {
        String uriValue = call.getString("uri");

        if (uriValue == null || uriValue.trim().isEmpty()) {
            call.reject("Missing APK uri");
            return;
        }

        try {
            Uri installUri = getInstallUri(uriValue);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(installUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            grantInstallerReadAccess(installUri, intent);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject("No Android package installer was found", error);
        } catch (Exception error) {
            call.reject("Could not open APK installer", error);
        }
    }

    private Uri getInstallUri(String uriValue) throws Exception {
        Uri sourceUri = Uri.parse(uriValue);
        String scheme = sourceUri.getScheme();

        if ("content".equalsIgnoreCase(scheme)) {
            return sourceUri;
        }

        File apkFile = "file".equalsIgnoreCase(scheme)
            ? new File(sourceUri.getPath())
            : new File(uriValue);

        if (!apkFile.exists()) {
            throw new Exception("APK file does not exist: " + apkFile.getAbsolutePath());
        }

        return FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );
    }

    private void grantInstallerReadAccess(Uri installUri, Intent intent) {
        PackageManager packageManager = getContext().getPackageManager();
        List<ResolveInfo> installers = packageManager.queryIntentActivities(
            intent,
            PackageManager.MATCH_DEFAULT_ONLY
        );

        for (ResolveInfo installer : installers) {
            getContext().grantUriPermission(
                installer.activityInfo.packageName,
                installUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        }
    }
}
