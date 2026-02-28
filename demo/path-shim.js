import pathBrowserify from 'path-browserify'

const originalJoin = pathBrowserify.join.bind(pathBrowserify)

pathBrowserify.join = function (...args) {
  if (args.length > 0 && /^https?:\/\//.test(args[0])) {
    const base = args[0].replace(/\/+$/, '')
    const rest = args.slice(1).map(s => s.replace(/^\/+|\/+$/g, ''))
    return [base, ...rest].join('/')
  }
  return originalJoin(...args)
}

export default pathBrowserify
export const {
  resolve, normalize, isAbsolute, join, relative,
  dirname, basename, extname, format, parse, sep, delimiter, posix, win32,
} = pathBrowserify
