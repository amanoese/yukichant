const message = `Usage: yukichant [options] [text]

yukichant is convert text to magic spell.

Arguments:
  text           input text (default: "")

Options:
  -V, --version  output the version number
  -d             decode flag
  -s             strict decode mode flag
  --no-tfidf     disable tfidf mode flag when strict decode mode flag is
                 enabled
  --levenshtein  use Levenshtein distance algorithm instead of Jaro-Winkler
  -v             verbose mode flag
  -vv            more verbose
  -h, --help     display help for command
`
export default message
