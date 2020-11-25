import { init as initLexer, parse as parseEsModule } from 'es-module-lexer'
import resolveUrl from './resolve-url'

// TODO: replace each import to real path
// TODO: replace imports

class ModuleShim {
  constructor(importMap, entryPoint) {
    this._importMap = importMap
    this._entryPoint = entryPoint
    this._transformations = []
  }
  
  async initialize() {
    await initLexer
    const rootScript = await this._processScript(this._entryPoint, '/')
    eval(rootScript)
  }
  
  /**
   * @param {function(path:string):boolean} condition
   * @param {function(source:string):string} transform
   */
  registerTransformation(condition, transform) {
    this._transformations.push({ condition, transform })
  }
  
  async _processScript(path, scope) {
    const realPath = this._resolvePath(path, scope)
    
    let transformFunc = s => s
    for (const { condition, transform } of this._transformations) {
      if (condition(realPath)) {
        transformFunc = transform
      }
    }
    
    return fetch(realPath)
      .then(r => r.text)
      .then(transformFunc)
      .then(async source => {
        const [imports] = parseEsModule(source)
        
        for (const { s: start, e: end } of imports) {
          const innerImportPath = source.slice(start, end)
          await this._processScript(innerImportPath, path)
          source = [
            source.slice(0, start),
            this._resolvePath(innerImportPath),
            source.slice(end, source.length),
          ].join('')
        }
    
        return source
      })
  }
  
  _resolvePath(path, scope) {
    return resolveUrl(this._importMap[path] || path, scope)
  }
}

export default ModuleShim
