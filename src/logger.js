import log from 'loglevel';

// デフォルトはwarn（エラーと警告のみ）
log.setLevel('warn');

// CLIオプションからログレベルを設定する関数
export function setLogLevel(option) {
  if (option.Vv) {
    log.setLevel('trace'); // 最も詳細
  } else if (option.v) {
    log.setLevel('debug'); // デバッグ情報
  } else {
    log.setLevel('warn');  // 通常は警告とエラーのみ
  }
}

export default log;





