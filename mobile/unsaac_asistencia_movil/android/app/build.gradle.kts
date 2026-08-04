plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}


// UNSAAC_RELEASE_SIGNING_V1
val unsaacKeystorePath = System.getenv("UNSAAC_KEYSTORE_PATH")
val unsaacKeyAlias = System.getenv("UNSAAC_KEY_ALIAS")
val unsaacStorePassword = System.getenv("UNSAAC_STORE_PASSWORD")
val unsaacKeyPassword = System.getenv("UNSAAC_KEY_PASSWORD")

val unsaacSigningEnvironmentReady =
    !unsaacKeystorePath.isNullOrBlank() &&
        !unsaacKeyAlias.isNullOrBlank() &&
        !unsaacStorePassword.isNullOrBlank() &&
        !unsaacKeyPassword.isNullOrBlank()

val unsaacReleaseRequested =
    gradle.startParameter.taskNames.any {
        it.contains("Release", ignoreCase = true)
    }

if (unsaacReleaseRequested && !unsaacSigningEnvironmentReady) {
    throw GradleException(
        "Faltan las variables protegidas para firmar la APK release UNSAAC."
    )
}
android {
    namespace = "pe.edu.unsaac.unsaac_asistencia_movil"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "pe.edu.unsaac.unsaac_asistencia_movil"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = 24
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {

        create("unsaacRelease") {

            if (unsaacSigningEnvironmentReady) {

                storeFile = file(unsaacKeystorePath!!)

                storePassword = unsaacStorePassword!!

                keyAlias = unsaacKeyAlias!!

                keyPassword = unsaacKeyPassword!!

            }

        }

    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig =
                if (unsaacSigningEnvironmentReady) {
                    signingConfigs.getByName("unsaacRelease")
                } else {
                    signingConfigs.getByName("debug")
                }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    implementation("androidx.biometric:biometric:1.1.0")
}
