
import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>CodexMaker</span>,
  project: {
    link: 'https://github.com/VictorDoyle/CodexMaker',
  },
  docsRepositoryBase: 'https://github.com/VictorDoyle/CodexMaker/tree/main',
  sidebar: {
    defaultMenuCollapseLevel: 2,
    toggleButton: true,
    autoCollapse: true,
    titleComponent: ({ title }) => <>{title}</>
  },
  footer: {
    text: 'MIT 2024 © CodexMaker, Victor Doyle',
  },
  navigation: {
    prev: true,
    next: true
  },
  toc: {
    title: 'On This Page',
    extraContent: null
  }
}

export default config
