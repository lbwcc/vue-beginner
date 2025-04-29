<template>
  <div id="main">
    <h1>echarts的使用</h1>
    <div id="demo" style="height: 50vw; max-width: 500px; width: 100%"></div>
  </div>
</template>

<script>
import * as Echarts5 from "echarts";
export default {
  data() {
    return {
      chartDemo: null,
    };
  },
  mounted() {
    let demoDom = document.getElementById("demo");
    //柱状图
    // let chartDemOption = {
    //     legend:{
    //         orient:'horizontal',
    //         top:'top',
    //         data:["香蕉","苹果","橘子"],
    //         selected:{
    //             香蕉:true,
    //             苹果:true,
    //             橘子:true
    //         }
    //     },
    //     tooltip:{},
    //     series:[
    //         {
    //             type:'bar',
    //             name:'香蕉',
    //             data:[1,2,5,6]
    //         },{
    //             type:'bar',
    //             name:'苹果',
    //             data:[4,6,3,9]
    //         },{
    //             type:'bar',
    //             name:'橘子',
    //             data:[7,4,7,4]
    //         },
    //     ],
    //     xAxis:{
    //         type: 'category',
    //         data: ["香蕉","苹果","橘子"]
    //     },
    //     yAxis:{
    //         type:'value',
    //         name:'数量'
    //     },
    // }
    //饼图
    let chartDemOption = {
      series: [
        {
          type: "pie",
          color: ['yellow','red','orange'],
          data: [
            {
              name: "banana",
              value: 40,
            },
            {
              name: "apple",
              value: 30,
            },
            {
              name: "orange",
              value: 30,
            },
          ],
          radius:'60%'
        },
      ],
    };
    this.chartDemo = Echarts5.init(demoDom);
    this.chartDemo.setOption(chartDemOption);
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.chartDemo) {
      this.chartDemo.dispose();
    }
  },
  methods: {
    handleResize() {
      if (this.chartDemo) {
        this.chartDemo.resize();
      }
    }
  }
};
</script>

<style>
#main {
  display: flex;
  flex-direction: column;
  align-items: center;
}
#demo {
  width: 100%;
  max-width: 500px;
  height: 50vw;
  min-height: 300px;
}
@media (max-width: 600px) {
  #demo {
    height: 60vw;
    min-height: 200px;
  }
}
</style>