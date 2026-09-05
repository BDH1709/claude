plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "nl.bdh.stilte"
    compileSdk = 36

    defaultConfig {
        applicationId = "nl.bdh.stilte"
        minSdk = 29
        targetSdk = 36
        versionCode = 1
        versionName = "0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
