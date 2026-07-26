// 添加环境变量，名称：GROUP，值：策略组名称
// IPPure 6-tier risk labels (优质/良好/普通/低危/中危/高危)

export default async function(ctx) {

  const strategyGroup =
    ctx.env.GROUP || 'DIRECT';

  const widgetFamily =
    ctx.widgetFamily || 'systemLarge';


  const C = {
    bgTop: '#0C0D0F',
    bgBottom: '#141619',

    borderColor: 'rgba(255, 255, 255, 0.06)',

    text: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',

    blue: '#60A5FA',

    // IPPure 6 档风险色（自定义标签）
    risk0: '#166534',  // 0-15   优质
    risk1: '#22C55E',  // 15-25  良好
    risk2: '#84CC16',  // 25-40  普通
    risk3: '#EAB308',  // 40-50  低危
    risk4: '#F97316',  // 50-70  中危
    risk5: '#DC2626',  // 70-100 高危

    green: '#34D399',
    yellow: '#FACC15',
    red: '#F87171',
  };

  const premiumGradient = {
    type: 'linear',
    colors: [C.bgTop, C.bgBottom],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 }
  };


  let data = null;

  try {

    const resp = await ctx.http.get(
      'https://my.ippure.com/v1/info',
      {
        policy: strategyGroup,
        timeout: 8000
      }
    );

    data = await resp.json();

  } catch(e) {}


  if (!data) {

    data = {
      ip: '请求失败',
      asn: '---',
      asOrganization: 'Network Error',
      country: 'Unknown',
      region: '',
      city: '',
      fraudScore: 99,
      isResidential: false
    };

  }


  const riskScore =
    Number(data.fraudScore || 0);

  let riskText = '高危';
  let riskColor = C.risk5;

  let riskEmoji = '🤖';

  if (riskScore <= 15) {
    riskText = '优质';
    riskColor = C.risk0;
    riskEmoji = '💎';
  } else if (riskScore <= 25) {
    riskText = '良好';
    riskColor = C.risk1;
    riskEmoji = '✨';
  } else if (riskScore <= 40) {
    riskText = '普通';
    riskColor = C.risk2;
    riskEmoji = '😐';
  } else if (riskScore <= 50) {
    riskText = '低危';
    riskColor = C.risk3;
    riskEmoji = '🤔';
  } else if (riskScore <= 70) {
    riskText = '中危';
    riskColor = C.risk4;
    riskEmoji = '⚠️';
  }


  const networkText =
    data.isResidential === true
      ? '住宅原生'
      : '机房网络';

  const networkColor =
    data.isResidential === true
      ? C.green
      : C.yellow;


  const locationText = [
    data.country,
    data.region,
    data.city
  ]
  .filter(Boolean)
  .join(' · ');

  const shortLocation = [
    data.country,
    data.city
  ]
  .filter(Boolean)
  .join(' · ');


  function row(label, value, valueColor) {

    return {
      type: 'stack',
      direction: 'row',
      children: [

        {
          type: 'text',
          text: label,
          font: {
            size: 'caption1',
            weight: 'medium'
          },
          textColor: C.muted
        },

        {
          type: 'spacer'
        },

        {
          type: 'text',
          text: value,
          font: {
            size: 'caption1',
            weight: 'medium'
          },
          textColor: valueColor || C.secondary,
          textAlign: 'right'
        }

      ]
    };

  }

  function badge(text, color) {

    return {
      type: 'stack',
      direction: 'row',
      gap: 5,
      children: [

        {
          type: 'image',
          src: 'sf-symbol:circle.fill',
          width: 7,
          height: 7,
          color: color
        },

        {
          type: 'text',
          text: text,
          font: {
            size: 'caption2',
            weight: 'bold'
          },
          textColor: color
        }

      ]
    };

  }

  // ============================================
  // LOCK SCREEN: CIRCULAR
  // ============================================

  if (widgetFamily === 'accessoryCircular') {

    return {

      type: 'widget',
      padding: 4,
      gap: 0,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [
            { type: 'spacer' },
            {
              type: 'text',
              text: String(riskScore),
              font: { size: 32, weight: 'bold' },
              textColor: riskColor,
              textAlign: 'center'
            },
            { type: 'spacer' }
          ]
        },

        {
          type: 'stack',
          direction: 'row',
          children: [
            { type: 'spacer' },
            {
              type: 'text',
              text: riskText,
              font: { size: 8, weight: 'medium' },
              textColor: C.muted,
              textAlign: 'center',
              maxLine: 1
            },
            { type: 'spacer' }
          ]
        }

      ]

    };

  }

  // ============================================
  // LOCK SCREEN: RECTANGULAR
  // ============================================

  if (widgetFamily === 'accessoryRectangular') {

    return {

      type: 'widget',
      padding: [6, 10],
      gap: 2,

      children: [

        {
          type: 'text',
          text: (data.countryCode || data.country || '--') + (data.city ? ' · ' + data.city : ''),
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: C.text,
          maxLine: 1
        },

        {
          type: 'text',
          text: data.asOrganization || 'Unknown',
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: C.secondary,
          maxLine: 1
        },

        {
          type: 'text',
          text: networkText,
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: networkColor,
          maxLine: 1
        }

      ]

    };

  }

  // ============================================
  // LOCK SCREEN: INLINE
  // ============================================

  if (widgetFamily === 'accessoryInline') {

    return {

      type: 'widget',

      children: [

        {
          type: 'text',
          text: (data.countryCode || data.country || '--') + ' · ' + networkText,
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: C.text,
          maxLine: 1
        }

      ]

    };

  }

  // ============================================
  // SMALL
  // ============================================

  if (widgetFamily === 'systemSmall') {

    return {

      type: 'widget',
      backgroundGradient: premiumGradient,
      border: { width: 1, color: C.borderColor },
      padding: 16,
      gap: 10,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'stack',
              direction: 'row',
              gap: 6,
              children: [

                {
                  type: 'image',
                  src: 'sf-symbol:leaf.fill',
                  width: 14,
                  height: 14,
                  color: C.green
                },

                {
                  type: 'text',
                  text: strategyGroup,
                  font: {
                    size: 'caption1',
                    weight: 'bold'
                  },
                  textColor: C.blue
                }

              ]
            }

          ]
        },

        {
          type: 'text',
          text: data.country || 'Unknown',
          font: {
            size: 15,
            weight: 'semibold'
          },
          textColor: C.text
        },

        badge(networkText, networkColor),

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 8,
          children: [

            {
              type: 'text',
              text: String(riskScore),
              font: {
                size: 30,
                weight: 'bold'
              },
              textColor: riskColor
            },

            {
              type: 'stack',
              children: [

                {
                  type: 'spacer'
                },

                {
                  type: 'text',
                  text: riskText,
                  font: {
                    size: 'caption1',
                    weight: 'bold'
                  },
                  textColor: riskColor
                }

              ]
            }

          ]
        }

      ]

    };

  }

  // ============================================
  // MEDIUM
  // ============================================

  if (widgetFamily === 'systemMedium') {

    return {

      type: 'widget',
      backgroundGradient: premiumGradient,
      border: { width: 1, color: C.borderColor },
      padding: 18,
      gap: 10,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'stack',
              direction: 'row',
              gap: 8,
              children: [

                {
                  type: 'image',
                  src: 'sf-symbol:leaf.fill',
                  width: 16,
                  height: 16,
                  color: C.green
                },

                {
                  type: 'text',
                  text: 'IPPure',
                  font: {
                    size: 'headline',
                    weight: 'bold'
                  },
                  textColor: C.text
                }

              ]
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: strategyGroup,
              font: {
                size: 'caption1',
                weight: 'bold'
              },
              textColor: C.blue
            }

          ]
        },

        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 24,
            weight: 'bold'
          },
          textColor: C.text
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 10,
          children: [

            badge(networkText, networkColor),

            badge(riskText, riskColor)

          ]
        },

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'text',
              text: shortLocation || 'Unknown',
              font: {
                size: 'subheadline'
              },
              textColor: C.secondary
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: String(riskScore),
              font: {
                size: 'title3',
                weight: 'bold'
              },
              textColor: riskColor
            }

          ]
        }

      ]

    };

  }

  // ============================================
  // EXTRA LARGE (iPad)
  // ============================================

  if (widgetFamily === 'systemExtraLarge') {

    return {

      type: 'widget',
      backgroundGradient: premiumGradient,
      border: { width: 1, color: C.borderColor },
      padding: 22,
      gap: 16,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'stack',
              direction: 'row',
              gap: 8,
              children: [

                {
                  type: 'image',
                  src: 'sf-symbol:leaf.fill',
                  width: 20,
                  height: 20,
                  color: C.green
                },

                {
                  type: 'text',
                  text: 'IPPure',
                  font: {
                    size: 'headline',
                    weight: 'bold'
                  },
                  textColor: C.text
                }

              ]
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: strategyGroup,
              font: {
                size: 'caption1',
                weight: 'bold'
              },
              textColor: C.blue
            }

          ]
        },

        {
          type: 'text',
          text: 'CURRENT IP',
          font: {
            size: 'caption1',
            weight: 'bold'
          },
          textColor: C.muted
        },

        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 36,
            weight: 'bold'
          },
          textColor: C.text
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 14,
          children: [

            badge(networkText, networkColor),

            badge(riskText, riskColor)

          ]
        },

        row(
          '位置',
          locationText || 'Unknown'
        ),

        row(
          '运营商',
          data.asOrganization || 'Unknown'
        ),

        row(
          'ASN',
          String(data.asn || '---')
        ),

        row(
          '广播IP',
          data.isBroadcast === true ? '是' : '否'
        ),

        row(
          '风险系数',
          String(riskScore),
          riskColor
        ),

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 6,
          children: [

            {
              type: 'image',
              src: 'sf-symbol:checkmark.circle.fill',
              width: 12,
              height: 12,
              color: C.green
            },

            {
              type: 'text',
              text: 'Connection Active',
              font: {
                size: 'caption2'
              },
              textColor: C.secondary
            }

          ]
        }

      ]

    };

  }

  // ============================================
  // LARGE
  // ============================================

  return {

    type: 'widget',
    backgroundGradient: premiumGradient,
    border: { width: 1, color: C.borderColor },
    padding: 20,
    gap: 14,

    children: [

      {
        type: 'stack',
        direction: 'row',
        children: [

          {
            type: 'stack',
            direction: 'row',
            gap: 8,
            children: [

              {
                type: 'image',
                src: 'sf-symbol:leaf.fill',
                width: 18,
                height: 18,
                color: C.green
              },

              {
                type: 'text',
                text: 'IPPure',
                font: {
                  size: 'headline',
                  weight: 'bold'
                },
                textColor: C.text
              }

            ]
          },

          {
            type: 'spacer'
          },

          {
            type: 'text',
            text: strategyGroup,
            font: {
              size: 'caption1',
              weight: 'bold'
            },
            textColor: C.blue
          }

        ]
      },

      {
        type: 'text',
        text: 'CURRENT IP',
        font: {
          size: 'caption1',
          weight: 'bold'
        },
        textColor: C.muted
      },

      {
        type: 'text',
        text: data.ip || 'N/A',
        font: {
          size: 32,
          weight: 'bold'
        },
        textColor: C.text
      },

      {
        type: 'stack',
        direction: 'row',
        gap: 14,
        children: [

          badge(networkText, networkColor),

          badge(riskText, riskColor)

        ]
      },

      row(
        '位置',
        locationText || 'Unknown'
      ),

      row(
        '运营商',
        data.asOrganization || 'Unknown'
      ),

      row(
        '广播IP',
        data.isBroadcast === true ? '是' : '否'
      ),

      {
        type: 'stack',
        direction: 'row',
        children: [

          {
            type: 'text',
            text: '风险系数',
            font: {
              size: 'caption1',
              weight: 'medium'
            },
            textColor: C.muted
          },

          { type: 'spacer' },

          {
            type: 'text',
            text: String(riskScore),
            font: {
              size: 'caption1',
              weight: 'bold'
            },
            textColor: riskColor,
            textAlign: 'right'
          }

        ]
      },

      {
        type: 'spacer'
      },

      {
        type: 'stack',
        direction: 'row',
        gap: 6,
        children: [

          {
            type: 'image',
            src: 'sf-symbol:checkmark.circle.fill',
            width: 12,
            height: 12,
            color: C.green
          },

          {
            type: 'text',
            text: 'Connection Active',
            font: {
              size: 'caption2'
            },
            textColor: C.secondary
          }

        ]
      }

    ]

  };

}
