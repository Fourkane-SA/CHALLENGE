import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { BarSeriesOption, dataTool, EChartsOption, LineSeriesOption } from 'echarts';
import moment from 'moment';

import { Asset } from '../../models/asset.model';
import { ChallengeService } from '../../services/challenge.service';

moment.locale('fr');

interface SystemStackChart {
  id: string;
  options: EChartsOption;
}

interface PieData {
  name: string;
  value: number;
}

@Component({
  selector: 'app-challenge',
  templateUrl: './challenge.component.html',
  styleUrls: ['./challenge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChallengeComponent implements AfterViewInit {
  public systemByEnvOpts: EChartsOption;
  public assetsBySystemOpts: EChartsOption;
  public systemsStackedCharts: SystemStackChart[];
  public machinesOutputsOpts: EChartsOption;
  private systemsIdsForStackedChart = ["sys002", "sys005", "sys006", "sys007"];
  private systemsIdsForAssetPieChart = ["sys005", "sys006", "sys007", "sys008", "sys009", "sys010", "sys011", "sys012", "sys013"];
  private machines: Asset[];
  constructor(
    private cdkRef: ChangeDetectorRef,
    private challengeService: ChallengeService
  ) {
  }

  //Pas besoin de toucher a l'initialisation
  ngAfterViewInit(): void {
    this.machines = this.challengeService.getAssets.filter(asset => asset.system_ids.includes("sys005"));
    this.systemByEnvOpts = {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2
          },
          data: this.systemByEnvData
        }
      ]
    }
    this.assetsBySystemOpts = {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2
          },
          data: this.assetBySystemData
        }
      ]
    }
    this.systemsStackedCharts = this.systemsIdsForStackedChart.map(system_id => {
      return {
        id: system_id,
        options: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (value) => `${value}°C`
          },
          legend: {
            data: this.getAssetNamesForSystem(system_id)
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: this.xAxisByHours,
          },
          yAxis: {
            type: 'value'
          },
          series: this.getTemperaturesByAssetForSystem(system_id)
        }
      }
    });
    this.machinesOutputsOpts = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: this.xAxisByDays
      },
      yAxis: {
        type: 'value'
      },
      series: this.machines.map(machine => this.getSerieForMachine(machine))
    }
    this.cdkRef.detectChanges();
  }

  getSystemName(system_id: string): string {
    return this.challengeService.getSystem(system_id)?.name;
  }

  /**
   * TODO: Récupérer le nombre de systemes par environnement
   * @returns {PieData[]} sous la forme [{name, value}]
   */
  get systemByEnvData(): PieData[] {
    let datas = [];
    this.challengeService.getEnvironments.forEach(env => {
      let data: PieData = { name: env.name, value: this.challengeService.getEnvironment(env.id).systems.length };
      datas.push(data);
    });
    return datas;
  }

  /**
   * TODO: Récupérer le nombre d'assets par systeme depuis this.systemsIdsForAssetPieChart
   * @returns {PieData[]} sous la forme [{name, value}]
   */
  get assetBySystemData(): PieData[] {
    let datas = [];
    this.systemsIdsForAssetPieChart.forEach(sys => {
      let data :PieData = { name:this.getSystemName(sys), value:this.challengeService.getSystem(sys).recursiveAssets.length};
      datas.push(data);
    });
    return datas;
  }

  /**
   * Renvoie les premières 24h de la timeframe
   */
  get xAxisByHours(): string[] {
    return this.challengeService.timeframe.map(hour => moment(hour).format('lll')).slice(0, 24);
  }

  /**
   * TODO: récupérer les jours depuis challengeService.timeframe
   * tip: utiliser moment(hour).format('LL') pour récupérer le jour pour une heure donnée
   */
  get xAxisByDays(): string[] {
    let days = [];
    this.challengeService.timeframe.forEach(date => {
      let day = moment(date).format('LL');
      if(! days.includes(day)) {
        days.push(day);
      }
    });
    return days;
  }

  /**
   * récupère le nom des assets ayant des températures pour un système donné
   * @param system_id id du systeme
   * @returns noms des assets
   */
  getAssetNamesForSystem(system_id: string): string[] {
    return this.challengeService.getSystem(system_id).recursiveAssets
      .filter(asset => asset.data.some(assetData => assetData.name === "temperature"))
      .map(asset => asset.label)
  }

  /**
   * TODO: récupérer les valeurs des températures des assets
   * seul data[] doit être modifié
   * @param system_id id du systeme concerné
   * @returns Series pour le LineChart
   */
  getTemperaturesByAssetForSystem(system_id: string): LineSeriesOption[] {
    return this.challengeService.getSystem(system_id).recursiveAssets
      .filter(asset => asset.data.some(assetData => assetData.name === "temperature"))
      .map(asset => ({
        name: asset.label,
        type: 'line',
        data: asset.data.find(elem => elem.name === "temperature").values
      }
      ));
  }

  /**
   * récupérer le nombre d'objets fabriqués par jour par machine
   * TODO: construire la map machineOutputData de telle sorte a ce qu'elle renvoie la somme des outputs par jour
   * @returns Series pour le LineChart
   */
  getSerieForMachine(machine: Asset): BarSeriesOption {
    const machineOutputData = new Map<string, number>();
    this.machines.find(mach => mach === machine).data.find(data => data.name === "output").values.forEach(value => {
      let day = moment(value.timestamp).format('LL');
      machineOutputData.has(day) ? machineOutputData.set(day, machineOutputData.get(day) + 1) : machineOutputData.set(day, 1);
    })
    return {
      name: machine.label,
      type: 'bar',
      stack: 'total',
      label: {
        show: true
      },
      data: Array.from(machineOutputData.values())
    }
  }

  ngForTrackByFn(index, item) {
    return item.id;
  }
}
