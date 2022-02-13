import React, { useMemo } from "react";

import { useTranslation } from "react-i18next";

import useApi from "@hooks/useApi";
import { theme } from "@styles/stitches.config";

import Section from "@components/Section";

import {
  chartRangeOptions,
  chartTypeOptions,
  createChartOptions,
  getDefaultChartConfig,
  getDefaultChartXAxis,
  getDefaultChartYAxis,
  transformChartData,
} from "@features/chart/chart-util";
import Chart, { ChartSkeleton } from "@features/chart/components/Chart";
import useCachedChartData from "@features/chart/hooks/useCachedChartData";

import WorldApi from "@features/world/world-api";

import type {
  ChartData,
  ChartVisualiserData,
} from "@features/chart/components/Chart_Visualiser";
import type {
  ChartDefaultOption,
  ChartRangeOptionValue,
  ChartTypeOptionValue,
} from "@features/chart/chart-type";

export type WorldStat = "confirmed" | "deceased";

type ChartCompareOptionValue =
  | "yesterday"
  | "weekAgo"
  | "monthAgo"
  | "twoWeeksAgo";

interface WorldOption extends ChartDefaultOption {
  compare: ChartCompareOptionValue;
}

type WorldOptionKey = keyof WorldOption;

const WorldChartSection: React.FC = () => {
  const { t, i18n } = useTranslation();

  const { getCachedChartData } = useCachedChartData("world");
  const { data: liveData } = useApi(WorldApi.live);

  const chartOptions = useMemo(
    () =>
      createChartOptions<WorldStat, WorldOptionKey>()({
        confirmed: {
          label: t("stat.confirmed"),
          options: {
            type: chartTypeOptions({ omit: ["accumulated"] }),
            range: chartRangeOptions(),
            compare: null,
          },

          overrideOptionsIf: [
            {
              type: "live",
              options: {
                compare: {
                  yesterday: {
                    label: t("live.yesterday"),
                  },
                  weekAgo: {
                    label: t("live.one_week_ago"),
                  },
                },
                range: null,
              },
            },
          ],
        },
        deceased: {
          label: t("stat.deceased"),

          options: {
            type: chartTypeOptions({ omit: ["live", "accumulated"] }),
            range: chartRangeOptions(),
          },
        },
      }),
    [t, i18n.language]
  );

  const getChartData = async (
    stat: WorldStat,
    option: WorldOption,
    mode: ChartMode
  ): Promise<Array<ChartVisualiserData>> => {
    let dataSet: ChartData[] = [];

    if (mode === "EXPANDED") {
      const data = await getCachedChartData({
        stat: ["confirmed", "deceased"] as Array<WorldStat>,
        apiName: "all",
        range: "oneMonth",
        isCompressed: true,
        isSingle: false,
      });

      const xAxis = getDefaultChartXAxis(option);
      const yAxis = getDefaultChartYAxis(option, { right: { id: stat } });

      const statLabel: Partial<Record<WorldStat, string>> = {
        confirmed: "확진자",
        deceased: "사망자",
      };

      return Object.keys(data).map((key) => ({
        dataSet: [
          {
            data: transformChartData(data[key], {
              type: option.type,
              range: option.range,
            }),
            config: getDefaultChartConfig(option, {
              statLabel: statLabel[key],
            }),
          },
        ],
        xAxis,
        yAxis,
      }));
    } else {
      const type = option?.type as ChartTypeOptionValue;
      const range = option?.range as ChartRangeOptionValue;
      const compare = option?.compare;

      const xAxis = getDefaultChartXAxis({ type, range });
      const yAxis = getDefaultChartYAxis(
        { type, range },
        { right: { id: stat } }
      );

      if (stat === "confirmed" && type === "live") {
        const today = liveData.hourlyLive["today"];
        const compared = liveData.hourlyLive[compare];

        const liveLabel: Record<string, string> = {
          yesterday: "어제",
          weekAgo: "1주전",
          twoWeeksAgo: "2주전",
          monthAgo: "한달전",
        };

        dataSet = [
          {
            data: compared,
            config: getDefaultChartConfig(
              {
                type,
                range,
              },
              {
                color: theme.colors.gray400,
                tooltipLabel: liveLabel[compare],
                chartType: "line",
                showPoints: true,
              }
            ),
          },
          {
            data: today,
            config: getDefaultChartConfig(
              {
                type,
                range,
              },
              {
                color: theme.colors.blue500,
                tooltipLabel: "오늘",
                chartType: "line",
                showPoints: true,
              }
            ),
          },
        ];
      } else {
        const data = await getCachedChartData({ stat: [stat], range });
        dataSet = [
          {
            data: transformChartData(data, {
              type: option.type,
              range: option.range,
            }),
            config: getDefaultChartConfig({ type, range }),
          },
        ];
      }

      return [
        {
          dataSet,
          xAxis,
          yAxis,
        },
      ];
    }
  };

  return (
    <Section>
      <Chart enableExpandMode {...{ chartOptions, getChartData }} />
    </Section>
  );
};

export const WorldChartSectionSkeleton = () => {
  return (
    <Section>
      <ChartSkeleton tabs={2} />
    </Section>
  );
};

export default WorldChartSection;