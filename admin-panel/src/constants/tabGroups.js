// Trendyol Product Dashboard - Tab Configuration

export const TAB_GROUPS = {
  main: {
    id: 'main-group',
    name: 'Analizler',
    tabs: [
      { id: 'overview', name: 'Genel Bakış' },
      { id: 'brand', name: 'Marka' },
      { id: 'category', name: 'Kategori' },
      { id: 'origin', name: 'Menşei' },
      { id: 'barcode', name: 'Barkod' },
      { id: 'keyword', name: 'Keyword Aracı' },
      { id: 'product-finder', name: 'Ürün Bulma' },
      { id: 'hidden-champions', name: 'Gizli Şampiyonlar' },
      { id: 'opportunity', name: 'Fırsat Haritası' }
    ]
  }
}

// Flat list of all tabs for backwards compatibility
export const ALL_TABS = Object.values(TAB_GROUPS).flatMap(group => group.tabs)

// Quick lookup: tab id -> group id
export const TAB_TO_GROUP = {}
Object.entries(TAB_GROUPS).forEach(([groupKey, group]) => {
  group.tabs.forEach(tab => {
    TAB_TO_GROUP[tab.id] = groupKey
  })
})

// Get frequently used tabs (for quick access)
export const FREQUENT_TABS = ['overview', 'brand']
