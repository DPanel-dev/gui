/// <reference types="vite/client" />
declare module '*.svg' {
  import * as React from 'react'
  const ReactComponent: React.FC<React.SVGProps>
  export = ReactComponent
}