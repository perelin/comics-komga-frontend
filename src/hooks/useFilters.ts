import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { filtersToSearchParams, searchParamsToFilters, type Filters } from '@/lib/komga/filters'

export function useFilters(): [Filters, (next: Filters) => void] {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => searchParamsToFilters(sp), [sp])
  const setFilters = useCallback((next: Filters) => {
    setSp(filtersToSearchParams(next), { replace: false })
  }, [setSp])
  return [filters, setFilters]
}
