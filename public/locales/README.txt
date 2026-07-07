Nine Winters — 번역 파일 (Localization files)
================================================

이 폴더의 ko.json / en.json 을 편집하면, 게임을 다시 켤 때 번역이 바로 바뀝니다.
Edit ko.json / en.json in this folder, then restart the game — your changes apply immediately.
(재빌드/재설치 불필요. No rebuild or reinstall needed.)

■ 형식 / Format
  "키": "화면에 보이는 글자"
  "key": "text shown on screen"

  예 / Example:
    "title.new": "✚ 새 게임",       ← 이 오른쪽 따옴표 안 글자만 고치세요
    "btn.exp.lbl": "탐험"           ← Only change the text inside the quotes on the right

■ 규칙 / Rules
  1) 왼쪽 "키"(key)는 절대 바꾸지 마세요. 값(오른쪽 따옴표 안)만 번역합니다.
     Never change the left "key". Translate only the value (inside the right quotes).
  2) {n} · {name} 같은 {중괄호} 표시는 그대로 두세요 — 게임이 숫자·이름으로 바꿉니다.
     Keep {placeholders} like {n} · {name} as-is — the game fills them in.
  3) 파일은 UTF-8 로 저장하세요. Save as UTF-8.
  4) 따옴표(")·쉼표(,)·중괄호({}) 구조를 깨지 마세요 (JSON 문법). 깨지면 그 파일은 무시되고 기본값이 쓰입니다.
     Don't break the JSON structure. If broken, the game falls back to built-in defaults.

■ 새 언어 추가 / Adding a language
  현재는 ko / en 만 로드합니다. 다른 언어는 이후 업데이트에서 지원 예정입니다.
  Only ko / en are loaded for now. More languages coming in a later update.
