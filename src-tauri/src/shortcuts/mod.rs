//! Global shortcut parsing utilities.
//!
//! Parses human-readable shortcut strings like `"Alt+Shift+Space"` into
//! Tauri's `Shortcut` struct for registration with the global shortcut plugin.
//!
//! # Supported Keys
//!
//! **Modifiers:** `Ctrl`, `Alt`, `Shift`, `Win`/`Meta`/`Cmd`
//!
//! **Keys:**
//! - Letters: `A`-`Z`
//! - Numbers: `0`-`9`
//! - Function keys: `F1`-`F12`
//! - Special: `Space`, `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`
//! - Arrow keys: `Up`, `Down`, `Left`, `Right`
//! - Punctuation: `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`
//!
//! # Example
//!
//! ```rust
//! use crate::shortcuts::parse_shortcut;
//!
//! let shortcut = parse_shortcut("Alt+Shift+Space")?;
//! // Now register with: global_shortcut.register(shortcut)
//! ```

use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

/// Parse a shortcut string into a `Shortcut` struct.
///
/// The string format is `"Modifier+Modifier+Key"` where:
/// - At least one modifier is required (Ctrl, Alt, Shift, or Win/Meta)
/// - Exactly one non-modifier key is required
/// - Parts are case-insensitive
/// - Parts are separated by `+`
///
/// # Arguments
///
/// * `shortcut_str` - Shortcut string like `"Alt+Shift+Space"` or `"Ctrl+K"`
///
/// # Returns
///
/// * `Ok(Shortcut)` - Parsed shortcut ready for registration
/// * `Err(String)` - Human-readable error message
///
/// # Errors
///
/// Returns an error if:
/// - The string is empty
/// - No modifier key is present
/// - No non-modifier key is present
/// - An unrecognized key name is used
///
/// # Examples
///
/// ```rust
/// // Valid shortcuts
/// parse_shortcut("Alt+Shift+Space")?;  // Ok
/// parse_shortcut("Ctrl+K")?;           // Ok
/// parse_shortcut("Ctrl+Alt+Delete")?;  // Ok
///
/// // Invalid shortcuts
/// parse_shortcut("Space");             // Err: no modifier
/// parse_shortcut("Ctrl+Alt");          // Err: no key
/// parse_shortcut("Alt+Unknown");       // Err: unknown key
/// ```
pub fn parse_shortcut(shortcut_str: &str) -> Result<Shortcut, String> {
    let parts: Vec<&str> = shortcut_str.split('+').map(|s| s.trim()).collect();

    if parts.is_empty() {
        return Err("Empty shortcut string".to_string());
    }

    let mut modifiers = Modifiers::empty();
    let mut key_code: Option<Code> = None;

    for part in parts {
        match part.to_lowercase().as_str() {
            // Modifiers
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "alt" => modifiers |= Modifiers::ALT,
            "shift" => modifiers |= Modifiers::SHIFT,
            "win" | "meta" | "super" | "cmd" | "command" => modifiers |= Modifiers::META,

            // Function keys
            "f1" => key_code = Some(Code::F1),
            "f2" => key_code = Some(Code::F2),
            "f3" => key_code = Some(Code::F3),
            "f4" => key_code = Some(Code::F4),
            "f5" => key_code = Some(Code::F5),
            "f6" => key_code = Some(Code::F6),
            "f7" => key_code = Some(Code::F7),
            "f8" => key_code = Some(Code::F8),
            "f9" => key_code = Some(Code::F9),
            "f10" => key_code = Some(Code::F10),
            "f11" => key_code = Some(Code::F11),
            "f12" => key_code = Some(Code::F12),

            // Special keys
            "space" => key_code = Some(Code::Space),
            "enter" | "return" => key_code = Some(Code::Enter),
            "tab" => key_code = Some(Code::Tab),
            "escape" | "esc" => key_code = Some(Code::Escape),
            "backspace" => key_code = Some(Code::Backspace),
            "delete" | "del" => key_code = Some(Code::Delete),
            "insert" | "ins" => key_code = Some(Code::Insert),
            "home" => key_code = Some(Code::Home),
            "end" => key_code = Some(Code::End),
            "pageup" | "pgup" => key_code = Some(Code::PageUp),
            "pagedown" | "pgdn" => key_code = Some(Code::PageDown),

            // Arrow keys
            "up" | "arrowup" => key_code = Some(Code::ArrowUp),
            "down" | "arrowdown" => key_code = Some(Code::ArrowDown),
            "left" | "arrowleft" => key_code = Some(Code::ArrowLeft),
            "right" | "arrowright" => key_code = Some(Code::ArrowRight),

            // Number keys
            "0" | "digit0" => key_code = Some(Code::Digit0),
            "1" | "digit1" => key_code = Some(Code::Digit1),
            "2" | "digit2" => key_code = Some(Code::Digit2),
            "3" | "digit3" => key_code = Some(Code::Digit3),
            "4" | "digit4" => key_code = Some(Code::Digit4),
            "5" | "digit5" => key_code = Some(Code::Digit5),
            "6" | "digit6" => key_code = Some(Code::Digit6),
            "7" | "digit7" => key_code = Some(Code::Digit7),
            "8" | "digit8" => key_code = Some(Code::Digit8),
            "9" | "digit9" => key_code = Some(Code::Digit9),

            // Letter keys
            "a" => key_code = Some(Code::KeyA),
            "b" => key_code = Some(Code::KeyB),
            "c" => key_code = Some(Code::KeyC),
            "d" => key_code = Some(Code::KeyD),
            "e" => key_code = Some(Code::KeyE),
            "f" => key_code = Some(Code::KeyF),
            "g" => key_code = Some(Code::KeyG),
            "h" => key_code = Some(Code::KeyH),
            "i" => key_code = Some(Code::KeyI),
            "j" => key_code = Some(Code::KeyJ),
            "k" => key_code = Some(Code::KeyK),
            "l" => key_code = Some(Code::KeyL),
            "m" => key_code = Some(Code::KeyM),
            "n" => key_code = Some(Code::KeyN),
            "o" => key_code = Some(Code::KeyO),
            "p" => key_code = Some(Code::KeyP),
            "q" => key_code = Some(Code::KeyQ),
            "r" => key_code = Some(Code::KeyR),
            "s" => key_code = Some(Code::KeyS),
            "t" => key_code = Some(Code::KeyT),
            "u" => key_code = Some(Code::KeyU),
            "v" => key_code = Some(Code::KeyV),
            "w" => key_code = Some(Code::KeyW),
            "x" => key_code = Some(Code::KeyX),
            "y" => key_code = Some(Code::KeyY),
            "z" => key_code = Some(Code::KeyZ),

            // Punctuation and symbols
            "`" | "backquote" => key_code = Some(Code::Backquote),
            "-" | "minus" => key_code = Some(Code::Minus),
            "=" | "equal" => key_code = Some(Code::Equal),
            "[" | "bracketleft" => key_code = Some(Code::BracketLeft),
            "]" | "bracketright" => key_code = Some(Code::BracketRight),
            "\\" | "backslash" => key_code = Some(Code::Backslash),
            ";" | "semicolon" => key_code = Some(Code::Semicolon),
            "'" | "quote" => key_code = Some(Code::Quote),
            "," | "comma" => key_code = Some(Code::Comma),
            "." | "period" => key_code = Some(Code::Period),
            "/" | "slash" => key_code = Some(Code::Slash),

            // Numpad
            "numpad0" => key_code = Some(Code::Numpad0),
            "numpad1" => key_code = Some(Code::Numpad1),
            "numpad2" => key_code = Some(Code::Numpad2),
            "numpad3" => key_code = Some(Code::Numpad3),
            "numpad4" => key_code = Some(Code::Numpad4),
            "numpad5" => key_code = Some(Code::Numpad5),
            "numpad6" => key_code = Some(Code::Numpad6),
            "numpad7" => key_code = Some(Code::Numpad7),
            "numpad8" => key_code = Some(Code::Numpad8),
            "numpad9" => key_code = Some(Code::Numpad9),

            other => {
                return Err(format!("Unknown key: {}", other));
            }
        }
    }

    match key_code {
        Some(code) => {
            if modifiers.is_empty() {
                Err(
                    "Shortcut must have at least one modifier (Ctrl, Alt, Shift, or Win)"
                        .to_string(),
                )
            } else {
                Ok(Shortcut::new(Some(modifiers), code))
            }
        }
        None => Err("Shortcut must have a non-modifier key".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_alt_shift_space() {
        let result = parse_shortcut("Alt+Shift+Space");
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_ctrl_alt_a() {
        let result = parse_shortcut("Ctrl+Alt+A");
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_invalid_no_modifier() {
        let result = parse_shortcut("Space");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_invalid_unknown_key() {
        let result = parse_shortcut("Alt+Unknown");
        assert!(result.is_err());
    }
}
