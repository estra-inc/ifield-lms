"use client"

import { ResponsiveRadar } from "@nivo/radar"

/**
 * レーダーチャートの軸データ
 */
export interface RadarAxisData {
  /** 軸名 (例: "Backend", "Frontend") */
  axis: string
  /** 達成率 (0-100) */
  value: number
  /** 最大値（常に 100） */
  fullMark: number
}

export interface RadarChartProps {
  data: RadarAxisData[]
}

/**
 * レーダーチャートコンポーネント
 *
 * Nivo (@nivo/radar) の ResponsiveRadar を使用してレーダーチャートを描画する。
 * 1 軸以下の場合はプログレスバー形式にフォールバックする。
 */
export function RadarChart({ data }: RadarChartProps) {
  // 1 軸以下の場合はプログレスバーにフォールバック
  if (data.length <= 1) {
    return (
      <div data-testid="progress-bar-fallback" className="flex flex-col gap-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            表示するデータがありません
          </p>
        ) : (
          data.map((d) => (
            <ProgressBarItem key={d.axis} axis={d.axis} value={d.value} />
          ))
        )}
      </div>
    )
  }

  // Nivo 用のデータ変換: { axis: string, score: number }[]
  const radarData = data.map((d) => ({
    axis: d.axis,
    score: d.value,
  }))

  return (
    <div data-testid="radar-chart-container">
      {/* 軸名と達成率の一覧（アクセシビリティ + テスト用） */}
      <div className="sr-only">
        {data.map((d) => (
          <span key={d.axis}>
            {d.axis}: {d.value}%
          </span>
        ))}
      </div>

      {/* レーダーチャート */}
      <div style={{ height: 300, width: "100%", minWidth: 300 }}>
        <ResponsiveRadar
          data={radarData}
          keys={["score"]}
          indexBy="axis"
          maxValue={100}
          margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
          gridLabelOffset={20}
          dotSize={8}
          dotColor={{ theme: "background" }}
          dotBorderWidth={2}
          colors={["hsl(var(--primary))"]}
          fillOpacity={0.25}
          borderWidth={2}
          borderColor={{ from: "color" }}
          gridShape="circular"
          enableDots={true}
          sliceTooltip={({ index, data: sliceData }) => {
            const item = sliceData[0]
            return (
              <div className="rounded-md bg-background px-3 py-2 text-sm shadow-md border">
                <span className="font-medium">{index}</span>:{" "}
                <span className="tabular-nums">
                  {typeof item.value === "number" ? item.value : 0}%
                </span>
              </div>
            )
          }}
        />
      </div>

      {/* 軸ラベル + 達成率の視覚的な表示 */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {data.map((d) => (
          <div key={d.axis} className="flex items-center gap-1.5 text-sm">
            <span className="font-medium">{d.axis}</span>
            <span className="tabular-nums text-muted-foreground">
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * プログレスバー形式の代替表示
 */
function ProgressBarItem({ axis, value }: { axis: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{axis}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className="h-3 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}
