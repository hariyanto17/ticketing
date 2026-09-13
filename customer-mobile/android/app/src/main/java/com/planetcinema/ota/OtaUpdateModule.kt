package com.planetcinema.ota

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.planetcinema.MainApplication
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class OtaUpdateModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OtaUpdateModule"

  private fun getOtaDir(): File {
    val dir = File(reactContext.filesDir, "ota_bundle")
    if (!dir.exists()) {
      dir.mkdirs()
    }
    return dir
  }

  private fun getActiveBundleFile(): File {
    return File(getOtaDir(), "index.android.bundle")
  }

  @ReactMethod
  fun getAppInfo(promise: Promise) {
    try {
      val pInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
      val activeBundle = getActiveBundleFile()
      val hasOta = activeBundle.exists() && activeBundle.isFile && activeBundle.length() > 0

      val map = Arguments.createMap().apply {
        putString("appVersion", pInfo.versionName ?: "1.0.0")
        putInt("buildNumber", if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
          pInfo.longVersionCode.toInt()
        } else {
          @Suppress("DEPRECATION")
          pInfo.versionCode
        })
        putBoolean("hasOtaBundle", hasOta)
        putString("otaBundlePath", if (hasOta) activeBundle.absolutePath else "")
        putDouble("otaBundleSize", if (hasOta) activeBundle.length().toDouble() else 0.0)
      }
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("ERR_APP_INFO", e.message, e)
    }
  }

  @ReactMethod
  fun downloadBundle(bundleUrl: String, expectedHash: String?, promise: Promise) {
    Thread {
      try {
        val url = URL(bundleUrl)
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 15000
        connection.readTimeout = 30000
        connection.requestMethod = "GET"
        connection.connect()

        if (connection.responseCode != HttpURLConnection.HTTP_OK) {
          promise.reject("HTTP_ERROR", "Server returned HTTP ${connection.responseCode}")
          return@Thread
        }

        val totalLength = connection.contentLength
        val inputStream: InputStream = connection.inputStream
        val tempFile = File(getOtaDir(), "temp_download.bundle")
        val outputStream = FileOutputStream(tempFile)

        val buffer = ByteArray(8192)
        var downloaded = 0
        var count: Int
        var lastEmitTime = System.currentTimeMillis()

        val digest = MessageDigest.getInstance("SHA-256")

        while (inputStream.read(buffer).also { count = it } != -1) {
          outputStream.write(buffer, 0, count)
          digest.update(buffer, 0, count)
          downloaded += count

          val now = System.currentTimeMillis()
          if (now - lastEmitTime > 150 || downloaded == totalLength) {
            lastEmitTime = now
            val progress = if (totalLength > 0) (downloaded.toFloat() / totalLength.toFloat()) else 0f
            emitProgress(progress, downloaded, totalLength)
          }
        }

        outputStream.flush()
        outputStream.close()
        inputStream.close()
        connection.disconnect()

        // Checksum verification if expected hash is supplied
        val computedHash = digest.digest().joinToString("") { "%02x".format(it) }
        if (!expectedHash.isNullOrBlank() && !expectedHash.equals(computedHash, ignoreCase = true)) {
          tempFile.delete()
          promise.reject("HASH_MISMATCH", "Bundle checksum mismatch! Expected: $expectedHash, got: $computedHash")
          return@Thread
        }

        // Atomically replace active bundle
        val activeFile = getActiveBundleFile()
        if (activeFile.exists()) {
          activeFile.delete()
        }
        val renamed = tempFile.renameTo(activeFile)
        if (!renamed) {
          // Fallback file copy if rename fails
          tempFile.copyTo(activeFile, overwrite = true)
          tempFile.delete()
        }

        val resultMap = Arguments.createMap().apply {
          putBoolean("success", true)
          putString("bundlePath", activeFile.absolutePath)
          putString("bundleHash", computedHash)
          putDouble("bundleSize", activeFile.length().toDouble())
        }
        promise.resolve(resultMap)
      } catch (e: Exception) {
        promise.reject("DOWNLOAD_FAILED", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  fun reloadApp(promise: Promise) {
    Handler(Looper.getMainLooper()).post {
      try {
        val app = reactContext.applicationContext
        if (app is MainApplication) {
          app.reactHost.reload("OTA Update Applied")
          promise.resolve(true)
        } else {
          val activity: Activity? = reactContext.currentActivity
          activity?.recreate()
          promise.resolve(true)
        }
      } catch (e: Exception) {
        val activity: Activity? = reactContext.currentActivity
        activity?.recreate()
        promise.resolve(true)
      }
    }
  }

  @ReactMethod
  fun clearOtaBundle(promise: Promise) {
    try {
      val activeFile = getActiveBundleFile()
      if (activeFile.exists()) {
        activeFile.delete()
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("CLEAR_FAILED", e.message, e)
    }
  }

  private fun emitProgress(progress: Float, downloaded: Int, total: Int) {
    if (reactContext.hasActiveReactInstance()) {
      val map = Arguments.createMap().apply {
        putDouble("progress", progress.toDouble())
        putInt("downloaded", downloaded)
        putInt("total", total)
      }
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit("OtaDownloadProgress", map)
    }
  }
}
