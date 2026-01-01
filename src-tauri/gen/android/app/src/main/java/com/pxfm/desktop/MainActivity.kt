package com.pxfm.desktop

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
    // false = light icons (for dark background), true = dark icons (for light background)
    windowInsetsController.isAppearanceLightStatusBars = false
  }
}
