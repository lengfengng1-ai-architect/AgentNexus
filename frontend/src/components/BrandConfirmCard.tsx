import type { BrandInput } from '../types/chat'
import { ConfirmCard } from './ConfirmCard'

interface BrandConfirmCardProps {
  brandInput: BrandInput
  onConfirm: () => void
  onCancel: () => void
}

export function BrandConfirmCard({ brandInput, onConfirm, onCancel }: BrandConfirmCardProps) {
  return (
    <ConfirmCard
      title="确认品牌信息"
      confirmText="确认，开始生成方案"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-2 gap-2">
        {brandInput.brand_name && (
          <div><span className="text-gray-500">品牌：</span><span className="font-medium">{brandInput.brand_name}</span></div>
        )}
        {brandInput.category && (
          <div><span className="text-gray-500">品类：</span><span className="font-medium">{brandInput.category}</span></div>
        )}
        {brandInput.city && (
          <div><span className="text-gray-500">城市：</span><span className="font-medium">{brandInput.city}</span></div>
        )}
        {brandInput.budget && (
          <div><span className="text-gray-500">预算：</span><span className="font-medium">{brandInput.budget}万</span></div>
        )}
        {brandInput.period && (
          <div><span className="text-gray-500">周期：</span><span className="font-medium">{brandInput.period}个月</span></div>
        )}
      </div>
    </ConfirmCard>
  )
}
