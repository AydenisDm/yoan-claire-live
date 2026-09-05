-keepattributes *Annotation*, InnerClasses, Signature, Exception
-keep class io.livekit.** { *; }
-keep class livekit.org.** { *; }
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
-dontwarn io.livekit.**

-keepclassmembers class com.eventview.app.data.api.** { *; }
-keep class com.eventview.app.data.api.** { *; }

-keepattributes kotlinx.serialization.Annotation
-keepclassmembers class **$$serializer { *; }
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> {
    static <1>$Companion Companion;
}

-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
