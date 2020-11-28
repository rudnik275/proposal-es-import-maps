import { init as initLexer, parse as parseEsModule } from 'es-module-lexer'
import resolveUrl from './resolve-url'

class ModuleShim {
  constructor(importMap = {}) {
    this._importMap = importMap
    this._cache = {}
  }
  
  async initialize(entryPoint, scope = '/') {
    await initLexer
    
    const script = document.createElement('script')
    script.type = 'module'
    script.src = await this._loadScript(entryPoint, scope)
    document.body.append(script)
  }
  
  async _loadScript(path, scope) {
    const realPath = this._resolvePath(path, scope)
    const inCache = realPath in this._cache
    if (!inCache) {
      this._cache[realPath] = await fetch(realPath)
        .then(r => r.text())
        .then(script => this._replaceImports(script, scope))
        .then(script => this._createBlob(script))
    }
    
    return this._cache[realPath]
  }
  
  _resolvePath(path, scope) {
    return resolveUrl(this._importMap[path] || path, scope)
  }
  
  async _replaceImports(script, scope) {
    const [imports] = parseEsModule(script)
    let resultStr = ''
    let fromIndex = 0
    
    for (const { s: start, e: end } of imports) {
      const abstractPath = script.slice(start, end)
      const blobUrl = await this._loadScript(abstractPath, scope)
      
      resultStr += script.slice(fromIndex, start)
      resultStr += blobUrl
      fromIndex = end
    }
    resultStr += script.slice(fromIndex, script.length)
    
    return resultStr
  }
  
  _createBlob (source) {
    return URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
  }
}

export default ModuleShim
