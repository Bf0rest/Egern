// =============================================
// Egern IPPure Widget V2 - UniFi Protect Style
// Edition: Studio Solid-Matte with Air-Gradient & Micro Border
// Risk tiers: IPPure 6-tier (custom labels)
// =============================================

export default async function(ctx) {

  const strategyGroup =
    ctx.env.STRATEGY_GROUP || 'DIRECT';

  const widgetFamily =
    ctx.widgetFamily || 'systemLarge';

  // ==================== Premium Color Palette ====================

  const C = {
    // 顶级的微调空气感黑灰：顶部稍深，底部稍浅，营造极为自然的沉浸感
    bgTop: '#0C0D0F',
    bgBottom: '#141619',

    // 物理微轮廓边框颜色（类似 UniFi 设备的精致外壳边缘）
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

    // 保留旧色用于向后兼容（网络类型等）
    green: '#34D399',
    yellow: '#FACC15',
    red: '#F87171',
  };

  // 垂直空气感渐变配置
  const premiumGradient = {
    type: 'linear',
    colors: [C.bgTop, C.bgBottom],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 }
  };

  // ==================== Fetch ====================

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

  // ==================== Fallback ====================

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

  // ==================== Risk & Colors (6-tier) ====================

  const riskScore =
    Number(data.fraudScore || 0);

  let riskText = '高危';
  let riskColor = C.risk5;

  if (riskScore <= 15) {
    riskText = '优质';
    riskColor = C.risk0;
  } else if (riskScore <= 25) {
    riskText = '良好';
    riskColor = C.risk1;
  } else if (riskScore <= 40) {
    riskText = '普通';
    riskColor = C.risk2;
  } else if (riskScore <= 50) {
    riskText = '低危';
    riskColor = C.risk3;
  } else if (riskScore <= 70) {
    riskText = '中危';
    riskColor = C.risk4;
  }

  // Circular widget icon — select by risk tier
  const riskIconMap = {
    risk0_house:    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAKg0lEQVR4nO2dDawdRRXH/1NaqEWpIrWkAkLBYiStSIJVjCmtIKSEbxAK1aiYSC0NIFUkwabRGhFJCB9pQ0iKCRTBr9aCIgUVo6gEo4EKKlgoWFsKFtrSL/p4728Od57Zbmdm7967u3fu7vklzc273ZmdnfO/s7NnzpwFFEVRFEVRFEVRFEVRFEVRFEVRFEVRlBpi0DBIjgBwEoBPAngvgG0AVgP4sTFmY6/bp5QIyakk/0Y3u0guIrmvGqGGkJxLcoDZ/JHke3rdXqVA7C87D2tIvk+NUANIXucw8KMkPybDPckpJO9zHLOW5OGoOZVPAkmeC2CU/XNk4lPask/qc70x5mddnOu7AL6W+nopgEuNMQOJ4+RcCwEsSB37IoDpxpjnOm2DsrdR3swxFD/caQeSvMFR383W2L4yVznKvEhyohqyjwTgMf4NbZad5xHBkZ20RalQAPLrJnmjo57rc9Yzz1HHOpJHqUEjFYA1/i2OOq4LlNkn8H9zVAR9IoCA8b8dKDOO5F9JXpRTBP8hOanT6288RSvAGv9WR9lvBcqMT3gEB0leHDj2UpJDqbr3qwgiEIA1/hJHuYWBMhNI/j11/CDJ2YEyX1ARRCYAgPG/EShzCMlnPceaEkPnFMFLJI8pol8aQxECCBj/2sB5D7Mu3hBDGSKYbUeLJBtVBPlF4LpnpznPU3YEydsdx389cL7DST7vMPa1JP/l+P6SQF0Xqwh6JABr/KWOY9Pu3mSZidaR4/ylszUneMZR55xAnbMcI5mMBJO77ZtG0IkAAsafHzjPUdaBk0SG8M+mjptA8umcIrjQIYJXVAQlCCBg/CsC55hkH9eSiMFmBR4Nn3Kc47LAOc53xBioCIoUgHjrPMafF6j/GDskJxnwzSuGkUAQkqtznutsjwim+Mo0nnYFYI1/l+P/5gYMMpnky6njd5M8s52OZ8tD+KTjnF8JlDnTniPJJpLHNd7YXQjgApLLct6Xj7O/vnSs32l5DEHyQJJ/yTnfOMMhgldVBJ0L4DnHzP3SDONLhyfZSfKUPMZvQwRXw4MIjeQbKoJiBJDHQSPRvptTZXaQlNDvjmFLBI/l9DnMtKNOEh0JuhBAlvFPILklVWYbyWndGH8YkmM9Igh5HU/1iOAjvjKNIocA5Jn9c4F6PkFya6qM/H1Cwe09gOQfHO1bEChzsr0FJRGhTkXTaVMAWcu000lur6qD2RLB73OuPJ5kb0UqgpwCyDK+q2NLv8+S3J/kbx3tXRQoM0NFkE8A4q27MNChpziGVnn0O7ZIY/sgOYbkr3NGH53oGK0Kv1XVQQBZxj/NMbmqfBGGLRE8nDP+cJqKICwAcaeek+FoST9ji6//g+gBJN9GcpXjOr6X8cRS+qQ1aux2rPSMWjxoZ2f429NeNlnle3+1rd8TkqNJPpBnD4JHBK8X9dgaNST3I3m/w/hnZCy7DsS6UYOta/p5nl1IJD/q8F1sr7UIPB0lQ/rpGdE36TX352PbtMnWqLbSIYJbAiKY2hgR2KHyFw7jexdpJGjDEXol4VuHIULYEsEKhwgWB0RwvGP9QkQwAzUz/i9TFykz+VNzRuBK2JakdIkWkqNI/sQhgiUBEbgWsXbUQgQe4wdX6Eh+yWF8idQZjz6A5EiS9zhEcJvNT5RHBF0tZvUU+5j0kMP4J2ekcUnj+GctAAAAAElFTkSuQmCC',
    risk1_sparkles: 'data:image/png;base64,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',
    risk2_neutral:  'data:image/png;base64,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',
    risk3_thinking: 'data:image/png;base64,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',
    risk4_warning:  'data:image/png;base64,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',
    risk5_poop:     'data:image/png;base64,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',
  };

  // Select icon by risk tier
  let riskIcon = riskIconMap.risk5_poop;
  if      (riskScore <= 15) riskIcon = riskIconMap.risk0_house;
  else if (riskScore <= 25) riskIcon = riskIconMap.risk1_sparkles;
  else if (riskScore <= 40) riskIcon = riskIconMap.risk2_neutral;
  else if (riskScore <= 50) riskIcon = riskIconMap.risk3_thinking;
  else if (riskScore <= 70) riskIcon = riskIconMap.risk4_warning;

  const networkText =
    data.isResidential === true
      ? '住宅原生'
      : '机房网络';

  const networkColor =
    data.isResidential === true
      ? C.green
      : C.yellow;

  // ==================== Location ====================

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

  // ==================== Helpers ====================

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
      gap: 2,

      children: [

        { type: 'spacer' },

        {
          type: 'image',
          src: riskIcon,
          width: 26,
          height: 26,
          color: '#FFFFFF'
        },

        { type: 'spacer' }

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

        // Header
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

        // Location
        {
          type: 'text',
          text: data.country || 'Unknown',
          font: {
            size: 15,
            weight: 'semibold'
          },
          textColor: C.text
        },

        // Network
        badge(networkText, networkColor),

        {
          type: 'spacer'
        },

        // Risk
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

        // Header
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

        // IP
        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 24,
            weight: 'bold'
          },
          textColor: C.text
        },

        // Status
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

        // Bottom
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

        // Header
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

        // Title
        {
          type: 'text',
          text: 'CURRENT IP',
          font: {
            size: 'caption1',
            weight: 'bold'
          },
          textColor: C.muted
        },

        // IP
        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 36,
            weight: 'bold'
          },
          textColor: C.text
        },

        // Status
        {
          type: 'stack',
          direction: 'row',
          gap: 14,
          children: [

            badge(networkText, networkColor),

            badge(riskText, riskColor)

          ]
        },

        // Details
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

        // Footer
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

      // Header
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

      // Title
      {
        type: 'text',
        text: 'CURRENT IP',
        font: {
          size: 'caption1',
          weight: 'bold'
        },
        textColor: C.muted
      },

      // IP
      {
        type: 'text',
        text: data.ip || 'N/A',
        font: {
          size: 32,
          weight: 'bold'
        },
        textColor: C.text
      },

      // Status
      {
        type: 'stack',
        direction: 'row',
        gap: 14,
        children: [

          badge(networkText, networkColor),

          badge(riskText, riskColor)

        ]
      },

      // Details
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

      // Footer
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
