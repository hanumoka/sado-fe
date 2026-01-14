/**
 * StorageByCategoryCard.tsx
 *
 * 테넌트별 스토리지 사용량 표시 카드 (계층형 UI)
 * - 테넌트별로 펼침/접힘 가능
 * - 원본 파일(DICOM)과 사전렌더링 파일(SYSTEM) 구분
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Building2, FileText, Image } from 'lucide-react'
import type { TenantStorageMetrics } from '@/types'

interface StorageByCategoryCardProps {
  data: TenantStorageMetrics[]
  isLoading?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function StorageByCategoryCard({ data, isLoading }: StorageByCategoryCardProps) {
  const [expandedTenants, setExpandedTenants] = useState<Set<number>>(new Set())

  const toggleTenant = (tenantId: number) => {
    setExpandedTenants(prev => {
      const next = new Set(prev)
      if (next.has(tenantId)) {
        next.delete(tenantId)
      } else {
        next.add(tenantId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const grandTotal = data.reduce((sum, item) => sum + item.totalSize, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">테넌트별 스토리지 사용량</h3>
        <div className="text-sm text-gray-500">
          총 {formatBytes(grandTotal)}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center text-gray-500 py-8">데이터 없음</div>
      ) : (
        <div className="space-y-2">
          {data.map(tenant => {
            const isExpanded = expandedTenants.has(tenant.tenantId)
            const tenantPercent = grandTotal > 0 ? (tenant.totalSize / grandTotal) * 100 : 0
            const originalPercent = tenant.totalSize > 0 ? (tenant.originalSize / tenant.totalSize) * 100 : 0
            const preRenderedPercent = tenant.totalSize > 0 ? (tenant.preRenderedSize / tenant.totalSize) * 100 : 0

            return (
              <div key={tenant.tenantId} className="border border-gray-100 rounded-lg overflow-hidden">
                {/* Tenant Header - 클릭하면 펼침/접힘 */}
                <button
                  onClick={() => toggleTenant(tenant.tenantId)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <Building2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {tenant.tenantName || `Tenant ${tenant.tenantId}`}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatBytes(tenant.totalSize)} ({tenantPercent.toFixed(1)}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${originalPercent}%` }}
                        title={`원본: ${formatBytes(tenant.originalSize)}`}
                      />
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${preRenderedPercent}%` }}
                        title={`사전렌더링: ${formatBytes(tenant.preRenderedSize)}`}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3 pl-10 space-y-3">
                    {/* 원본 파일 */}
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">원본 파일 (DICOM)</span>
                          <span className="text-gray-500">
                            {formatBytes(tenant.originalSize)} ({tenant.originalFileCount.toLocaleString()}개)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${originalPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 사전렌더링 파일 */}
                    <div className="flex items-center gap-3">
                      <Image className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">사전렌더링 (썸네일/비디오)</span>
                          <span className="text-gray-500">
                            {formatBytes(tenant.preRenderedSize)} ({tenant.preRenderedFileCount.toLocaleString()}개)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${preRenderedPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded"></span>
          원본
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-purple-500 rounded"></span>
          사전렌더링
        </div>
      </div>
    </div>
  )
}
