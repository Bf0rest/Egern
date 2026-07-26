// 添加环境变量，名称：GROUP，值：策略组名称
// 内置 IP 查询（$utils），无需外部风险评分 API

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


  let ip = null;
  let country = '--';
  let asn = '--';
  let aso = '--';
  let fetchOk = false;

  try {

    const resp = await ctx.http.get(
      'https://httpbin.org/ip',
      {
        policy: strategyGroup,
        timeout: 8000
      }
    );

    const body = await resp.json();
    ip = body.origin;

    if (ip) {
      country = $utils.geoip(ip) || '--';
      asn = String($utils.ipasn(ip) || '--');
      aso = $utils.ipaso(ip) || '--';
      fetchOk = true;
    }

  } catch(e) {}


  if (!fetchOk) {
    ip = '(no network)';
    aso = 'Network Error';
  }


  const shortLocation = country !== '--'
    ? country
    : 'Unknown';


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
              text: shortLocation,
              font: { size: 14, weight: 'bold' },
              textColor: C.text,
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
              text: 'AS' + asn,
              font: { size: 7, weight: 'medium' },
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
          text: country !== '--' ? country : 'Unknown',
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: C.text,
          maxLine: 1
        },

        {
          type: 'text',
          text: aso,
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: C.secondary,
          maxLine: 1
        },

        {
          type: 'text',
          text: 'AS' + asn,
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: C.blue,
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
          text: country !== '--'
            ? country + ' · AS' + asn
            : 'Unknown',
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
                  src: 'sf-symbol:globe',
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
          text: shortLocation,
          font: {
            size: 15,
            weight: 'semibold'
          },
          textColor: C.text
        },

        badge('AS' + asn, C.blue),

        {
          type: 'spacer'
        },

        {
          type: 'text',
          text: ip === '(no network)' ? ip : ip,
          font: {
            size: 12,
            weight: 'medium'
          },
          textColor: C.secondary,
          maxLine: 1
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
                  src: 'sf-symbol:globe',
                  width: 16,
                  height: 16,
                  color: C.green
                },

                {
                  type: 'text',
                  text: 'IPWhois',
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
          text: ip || 'N/A',
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

            badge(country !== '--' ? country : 'Unknown', C.green),

            badge('AS' + asn, C.blue)

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
              text: aso,
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
              text: ip === '(no network)' ? '✗' : '✓',
              font: {
                size: 'title3',
                weight: 'bold'
              },
              textColor: fetchOk ? C.green : C.red
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
                  src: 'sf-symbol:globe',
                  width: 20,
                  height: 20,
                  color: C.green
                },

                {
                  type: 'text',
                  text: 'IPWhois',
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
          text: ip || 'N/A',
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

            badge(country !== '--' ? country : 'Unknown', C.green),

            badge('AS' + asn, C.blue)

          ]
        },

        row(
          '国家',
          country !== '--' ? country : 'Unknown'
        ),

        row(
          '运营商',
          aso
        ),

        row(
          'ASN',
          'AS' + asn,
          C.blue
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
                src: 'sf-symbol:globe',
                width: 18,
                height: 18,
                color: C.green
              },

              {
                type: 'text',
                text: 'IPWhois',
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
        text: ip || 'N/A',
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

          badge(country !== '--' ? country : 'Unknown', C.green),

          badge('AS' + asn, C.blue)

        ]
      },

      row(
        '国家',
        country !== '--' ? country : 'Unknown'
      ),

      row(
        '运营商',
        aso
      ),

      {
        type: 'stack',
        direction: 'row',
        children: [

          {
            type: 'text',
            text: 'ASN',
            font: {
              size: 'caption1',
              weight: 'medium'
            },
            textColor: C.muted
          },

          { type: 'spacer' },

          {
            type: 'text',
            text: 'AS' + asn,
            font: {
              size: 'caption1',
              weight: 'bold'
            },
            textColor: C.blue,
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
