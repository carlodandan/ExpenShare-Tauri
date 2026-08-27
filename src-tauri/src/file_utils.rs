use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::FilePath;

/// Writes binary data to a `FilePath` destination.
/// On desktop, writes directly to the filesystem.
/// On Android, writes via ContentResolver if given a `content://` URI.
pub fn write_file_path(app: &AppHandle, file_path: &FilePath, data: &[u8]) -> Result<String, String> {
    match file_path {
        FilePath::Path(path) => {
            fs::write(path, data).map_err(|e| e.to_string())?;
            Ok(path.display().to_string())
        }
        FilePath::Url(url) => {
            #[cfg(target_os = "android")]
            {
                write_to_android_uri(app, url.as_str(), data)?;
                Ok(url.to_string())
            }
            #[cfg(not(target_os = "android"))]
            {
                if let Ok(path) = url.to_file_path() {
                    fs::write(&path, data).map_err(|e| e.to_string())?;
                    Ok(path.display().to_string())
                } else {
                    Err(format!("Unsupported URL path scheme: {}", url))
                }
            }
        }
    }
}

/// Reads binary data from a `FilePath` source.
/// On desktop, reads directly from the filesystem.
/// On Android, reads via ContentResolver if given a `content://` URI.
pub fn read_file_path(app: &AppHandle, file_path: &FilePath) -> Result<Vec<u8>, String> {
    match file_path {
        FilePath::Path(path) => fs::read(path).map_err(|e| e.to_string()),
        FilePath::Url(url) => {
            #[cfg(target_os = "android")]
            {
                read_from_android_uri(app, url.as_str())
            }
            #[cfg(not(target_os = "android"))]
            {
                if let Ok(path) = url.to_file_path() {
                    fs::read(&path).map_err(|e| e.to_string())
                } else {
                    Err(format!("Unsupported URL path scheme: {}", url))
                }
            }
        }
    }
}

#[cfg(target_os = "android")]
fn write_to_android_uri(app: &AppHandle, uri_str: &str, data: &[u8]) -> Result<(), String> {
    use jni::objects::JValue;
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main webview window".to_string())?;

    let mut inner_result: Result<(), String> = Err("JNI execution did not complete".to_string());

    window
        .with_webview(|webview| {
            inner_result = webview.jni_handle().exec(|env, context, _webview| {
                // 1. Parse android.net.Uri from uri_str
                let uri_str_j = env
                    .new_string(uri_str)
                    .map_err(|e| format!("JNI new_string error: {e}"))?;
                let uri_class = env
                    .find_class("android/net/Uri")
                    .map_err(|e| format!("JNI find_class android/net/Uri error: {e}"))?;
                let uri_obj = env
                    .call_static_method(
                        &uri_class,
                        "parse",
                        "(Ljava/lang/String;)Landroid/net/Uri;",
                        &[JValue::Object(&uri_str_j)],
                    )
                    .map_err(|e| format!("JNI Uri.parse error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI Uri.parse return object error: {e}"))?;

                // 2. Obtain ContentResolver from context (MainActivity)
                let resolver = env
                    .call_method(
                        &context,
                        "getContentResolver",
                        "()Landroid/content/ContentResolver;",
                        &[],
                    )
                    .map_err(|e| format!("JNI getContentResolver error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI resolver return object error: {e}"))?;

                // 3. Open OutputStream in truncate/write mode "wt"
                let mode_str_j = env
                    .new_string("wt")
                    .map_err(|e| format!("JNI new_string mode error: {e}"))?;
                let stream = env
                    .call_method(
                        &resolver,
                        "openOutputStream",
                        "(Landroid/net/Uri;Ljava/lang/String;)Ljava/io/OutputStream;",
                        &[JValue::Object(&uri_obj), JValue::Object(&mode_str_j)],
                    )
                    .map_err(|e| format!("JNI openOutputStream error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI stream return object error: {e}"))?;

                if stream.as_raw().is_null() {
                    return Err("ContentResolver.openOutputStream returned null".to_string());
                }

                // 4. Write data bytes to stream
                let byte_array = env
                    .byte_array_from_slice(data)
                    .map_err(|e| format!("JNI byte_array_from_slice error: {e}"))?;
                env.call_method(
                    &stream,
                    "write",
                    "([B)V",
                    &[JValue::Object(&byte_array)],
                )
                .map_err(|e| format!("JNI stream.write error: {e}"))?;

                // 5. Flush and close the stream to finalize the file
                env.call_method(&stream, "flush", "()V", &[])
                    .map_err(|e| format!("JNI stream.flush error: {e}"))?;
                env.call_method(&stream, "close", "()V", &[])
                    .map_err(|e| format!("JNI stream.close error: {e}"))?;

                Ok(())
            });
        })
        .map_err(|e| format!("with_webview error: {e}"))?;

    inner_result
}

#[cfg(target_os = "android")]
fn read_from_android_uri(app: &AppHandle, uri_str: &str) -> Result<Vec<u8>, String> {
    use jni::objects::{JByteArray, JValue};
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main webview window".to_string())?;

    let mut inner_result: Result<Vec<u8>, String> =
        Err("JNI execution did not complete".to_string());

    window
        .with_webview(|webview| {
            inner_result = webview.jni_handle().exec(|env, context, _webview| {
                // 1. Parse android.net.Uri from uri_str
                let uri_str_j = env
                    .new_string(uri_str)
                    .map_err(|e| format!("JNI new_string error: {e}"))?;
                let uri_class = env
                    .find_class("android/net/Uri")
                    .map_err(|e| format!("JNI find_class android/net/Uri error: {e}"))?;
                let uri_obj = env
                    .call_static_method(
                        &uri_class,
                        "parse",
                        "(Ljava/lang/String;)Landroid/net/Uri;",
                        &[JValue::Object(&uri_str_j)],
                    )
                    .map_err(|e| format!("JNI Uri.parse error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI Uri.parse return object error: {e}"))?;

                // 2. Obtain ContentResolver from context (MainActivity)
                let resolver = env
                    .call_method(
                        &context,
                        "getContentResolver",
                        "()Landroid/content/ContentResolver;",
                        &[],
                    )
                    .map_err(|e| format!("JNI getContentResolver error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI resolver return object error: {e}"))?;

                // 3. Open InputStream
                let stream = env
                    .call_method(
                        &resolver,
                        "openInputStream",
                        "(Landroid/net/Uri;)Ljava/io/InputStream;",
                        &[JValue::Object(&uri_obj)],
                    )
                    .map_err(|e| format!("JNI openInputStream error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI stream return object error: {e}"))?;

                if stream.as_raw().is_null() {
                    return Err("ContentResolver.openInputStream returned null".to_string());
                }

                // 4. ByteArrayOutputStream baos = new ByteArrayOutputStream();
                let baos_class = env
                    .find_class("java/io/ByteArrayOutputStream")
                    .map_err(|e| format!("JNI find_class ByteArrayOutputStream error: {e}"))?;
                let baos = env
                    .new_object(&baos_class, "()V", &[])
                    .map_err(|e| format!("JNI new ByteArrayOutputStream error: {e}"))?;

                // 5. Read stream in 8KB chunks
                let buffer = env
                    .new_byte_array(8192)
                    .map_err(|e| format!("JNI new_byte_array error: {e}"))?;
                loop {
                    let bytes_read = env
                        .call_method(
                            &stream,
                            "read",
                            "([B)I",
                            &[JValue::Object(&buffer)],
                        )
                        .map_err(|e| format!("JNI stream.read error: {e}"))?
                        .i()
                        .map_err(|e| format!("JNI read return int error: {e}"))?;

                    if bytes_read <= 0 {
                        break;
                    }

                    env.call_method(
                        &baos,
                        "write",
                        "([BII)V",
                        &[
                            JValue::Object(&buffer),
                            JValue::Int(0),
                            JValue::Int(bytes_read),
                        ],
                    )
                    .map_err(|e| format!("JNI baos.write error: {e}"))?;
                }

                // 6. Close InputStream
                env.call_method(&stream, "close", "()V", &[])
                    .map_err(|e| format!("JNI stream.close error: {e}"))?;

                // 7. Extract byte[] from ByteArrayOutputStream
                let byte_array_obj = env
                    .call_method(&baos, "toByteArray", "()[B", &[])
                    .map_err(|e| format!("JNI baos.toByteArray error: {e}"))?
                    .l()
                    .map_err(|e| format!("JNI toByteArray return object error: {e}"))?;

                let byte_array: JByteArray = byte_array_obj.into();
                let vec = env
                    .convert_byte_array(&byte_array)
                    .map_err(|e| format!("JNI convert_byte_array error: {e}"))?;

                Ok(vec)
            });
        })
        .map_err(|e| format!("with_webview error: {e}"))?;

    inner_result
}
