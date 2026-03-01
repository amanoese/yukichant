const message = `Usage: yukichant [options] [text]

yukichant is convert text to magic spell.

Arguments:
  text            input text (default: "")

Options:
  -V, --version   output the version number
  -d              decode flag
  -f, --furigana  display furigana (ruby)
  -s              disable typo correction (strict decode mode)
  --no-tfidf      disable tfidf mode for typo correction
  --levenshtein   use Levenshtein distance algorithm instead of Jaro-Winkler
  -v              verbose mode flag
  -vv             more verbose
  -h, --help      display help for command
`
export default message
