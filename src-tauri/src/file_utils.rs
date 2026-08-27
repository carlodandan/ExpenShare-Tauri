use std::fs;
use std::sync::mpsc;
use tauri::AppHandle;
use tauri_plugin_dialog::FilePath;

/// Writes binary data to a `FilePath` destination.
/// On desktop, writes directly to the filesystem.
/// On Android, writes via ContentResolver for `content://` URIs.
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
                    Err(format!("Unsupported URL scheme: {}", url))
                }
            }
        }
    }
}

/// Reads binary data from a `FilePath` source.
/// On desktop, reads directly from the filesystem.
/// On Android, reads via ContentResolver for `content://` URIs.
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
                    Err(format!("Unsupported URL scheme: {}", url))
                }
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Android-only helpers — use mpsc channels to ferry results out of
// the fire-and-forget `jni_handle().exec()` closure.
// ────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "android")]
fn write_to_android_uri(app: &AppHandle, uri_str: &str, data: &[u8]) -> Result<(), String> {
    use tauri::Manager;

    let (tx, rx) = mpsc::channel::<Result<(), String>>();
    let uri_str = uri_str.to_string();
    let data = data.to_vec();

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main webview window".to_string())?;

    window
        .with_webview(move |webview| {
            webview.jni_handle().exec(move |env, context, _webview| {
                let result = write_via_jni(env, &context, &uri_str, &data);
                let _ = tx.send(result);
            });
        })
        .map_err(|e| format!("with_webview error: {e}"))?;

    rx.recv().map_err(|e| format!("JNI channel error: {e}"))?.map_err(|e| e)
}

#[cfg(target_os = "android")]
fn read_from_android_uri(app: &AppHandle, uri_str: &str) -> Result<Vec<u8>, String> {
    use tauri::Manager;

    let (tx, rx) = mpsc::channel::<Result<Vec<u8>, String>>();
    let uri_str = uri_str.to_string();

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main webview window".to_string())?;

    window
        .with_webview(move |webview| {
            webview.jni_handle().exec(move |env, context, _webview| {
                let result = read_via_jni(env, &context, &uri_str);
                let _ = tx.send(result);
            });
        })
        .map_err(|e| format!("with_webview error: {e}"))?;

    rx.recv().map_err(|e| format!("JNI channel error: {e}"))?
}

// ────────────────────────────────────────────────────────────────────────────
// Pure JNI helpers – free functions, no `?` issues, called inside exec().
// ────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "android")]
fn write_via_jni(
    env: &mut jni::JNIEnv,
    context: &jni::objects::JObject,
    uri_str: &str,
    data: &[u8],
) -> Result<(), String> {
    use jni::objects::JValue;

    // 1. Parse android.net.Uri
    let uri_str_j = env.new_string(uri_str).map_err(|e| format!("new_string: {e}"))?;
    let uri_class = env.find_class("android/net/Uri").map_err(|e| format!("find Uri class: {e}"))?;
    let uri_obj = env
        .call_static_method(
            &uri_class,
            "parse",
            "(Ljava/lang/String;)Landroid/net/Uri;",
            &[JValue::Object(&uri_str_j)],
        )
        .map_err(|e| format!("Uri.parse: {e}"))?
        .l()
        .map_err(|e| format!("Uri.parse -> JObject: {e}"))?;

    // 2. getContentResolver()
    let resolver = env
        .call_method(context, "getContentResolver", "()Landroid/content/ContentResolver;", &[])
        .map_err(|e| format!("getContentResolver: {e}"))?
        .l()
        .map_err(|e| format!("getContentResolver -> JObject: {e}"))?;

    // 3. openOutputStream("wt") — truncates then writes
    let mode_j = env.new_string("wt").map_err(|e| format!("new_string mode: {e}"))?;
    let stream = env
        .call_method(
            &resolver,
            "openOutputStream",
            "(Landroid/net/Uri;Ljava/lang/String;)Ljava/io/OutputStream;",
            &[JValue::Object(&uri_obj), JValue::Object(&mode_j)],
        )
        .map_err(|e| format!("openOutputStream: {e}"))?
        .l()
        .map_err(|e| format!("openOutputStream -> JObject: {e}"))?;

    if stream.as_raw().is_null() {
        return Err("openOutputStream returned null".to_string());
    }

    // 4. Write bytes
    let byte_array = env.byte_array_from_slice(data).map_err(|e| format!("byte_array_from_slice: {e}"))?;
    env.call_method(&stream, "write", "([B)V", &[JValue::Object(&byte_array)])
        .map_err(|e| format!("stream.write: {e}"))?;

    // 5. flush + close to finalise the SAF file entry
    env.call_method(&stream, "flush", "()V", &[]).map_err(|e| format!("stream.flush: {e}"))?;
    env.call_method(&stream, "close", "()V", &[]).map_err(|e| format!("stream.close: {e}"))?;

    Ok(())
}

#[cfg(target_os = "android")]
fn read_via_jni(
    env: &mut jni::JNIEnv,
    context: &jni::objects::JObject,
    uri_str: &str,
) -> Result<Vec<u8>, String> {
    use jni::objects::{JByteArray, JValue};

    // 1. Parse android.net.Uri
    let uri_str_j = env.new_string(uri_str).map_err(|e| format!("new_string: {e}"))?;
    let uri_class = env.find_class("android/net/Uri").map_err(|e| format!("find Uri class: {e}"))?;
    let uri_obj = env
        .call_static_method(
            &uri_class,
            "parse",
            "(Ljava/lang/String;)Landroid/net/Uri;",
            &[JValue::Object(&uri_str_j)],
        )
        .map_err(|e| format!("Uri.parse: {e}"))?
        .l()
        .map_err(|e| format!("Uri.parse -> JObject: {e}"))?;

    // 2. getContentResolver()
    let resolver = env
        .call_method(context, "getContentResolver", "()Landroid/content/ContentResolver;", &[])
        .map_err(|e| format!("getContentResolver: {e}"))?
        .l()
        .map_err(|e| format!("getContentResolver -> JObject: {e}"))?;

    // 3. openInputStream()
    let stream = env
        .call_method(
            &resolver,
            "openInputStream",
            "(Landroid/net/Uri;)Ljava/io/InputStream;",
            &[JValue::Object(&uri_obj)],
        )
        .map_err(|e| format!("openInputStream: {e}"))?
        .l()
        .map_err(|e| format!("openInputStream -> JObject: {e}"))?;

    if stream.as_raw().is_null() {
        return Err("openInputStream returned null".to_string());
    }

    // 4. Read into a ByteArrayOutputStream
    let baos_class = env.find_class("java/io/ByteArrayOutputStream").map_err(|e| format!("find BAOS: {e}"))?;
    let baos = env.new_object(&baos_class, "()V", &[]).map_err(|e| format!("new BAOS: {e}"))?;
    let buf = env.new_byte_array(8192).map_err(|e| format!("new_byte_array: {e}"))?;

    loop {
        let n = env
            .call_method(&stream, "read", "([B)I", &[JValue::Object(&buf)])
            .map_err(|e| format!("stream.read: {e}"))?
            .i()
            .map_err(|e| format!("read -> int: {e}"))?;
        if n <= 0 {
            break;
        }
        env.call_method(
            &baos,
            "write",
            "([BII)V",
            &[JValue::Object(&buf), JValue::Int(0), JValue::Int(n)],
        )
        .map_err(|e| format!("baos.write: {e}"))?;
    }

    env.call_method(&stream, "close", "()V", &[]).map_err(|e| format!("stream.close: {e}"))?;

    // 5. Extract the byte array
    let byte_array_obj = env
        .call_method(&baos, "toByteArray", "()[B", &[])
        .map_err(|e| format!("toByteArray: {e}"))?
        .l()
        .map_err(|e| format!("toByteArray -> JObject: {e}"))?;

    let jba: JByteArray = byte_array_obj.into();
    env.convert_byte_array(&jba).map_err(|e| format!("convert_byte_array: {e}"))
}
