package com.planetcinema

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.planetcinema.ota.OtaUpdatePackage
import java.io.File

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    val otaBundleFile = File(filesDir, "ota_bundle/index.android.bundle")
    val jsBundleFilePath = if (otaBundleFile.exists() && otaBundleFile.isFile && otaBundleFile.length() > 0) {
      otaBundleFile.absolutePath
    } else {
      null
    }

    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(OtaUpdatePackage())
        },
      jsBundleFilePath = jsBundleFilePath
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
