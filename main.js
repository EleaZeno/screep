// 导入所需模块
var roleHarvester = require('roleHarvester');
var roleUpgrader = require('roleUpgrader');
var roleBuilder = require('roleBuilder');
var spawner = require('spawner');
var pathFinder = require('pathFinder');
var memoryUtils = require('memoryUtils');
var bayesianLogic = require('bayesianLogic');
var statisticsModule = require('statisticsModule');

// 游戏管理类
class GameManager {
  constructor() {
    this.lastMemoryCleanupTick = 0;
    this.lastSpawningTextUpdateTick = 0;
    this.lastPathFindingTick = 0;
    this.pathFindingInterval = 10;
  }

  run() {
    // 内存清理
    if (Game.time - this.lastMemoryCleanupTick >= 100) {
      memoryUtils.cleanUpMemory();
      this.lastMemoryCleanupTick = Game.time;
    }

    // 获取筛选后的角色数组
    var harvesters = memoryUtils.getHarvesters();
    var upgraders = memoryUtils.getUpgraders();
    var builders = memoryUtils.getBuilders();

    // 角色执行逻辑
    harvesters.forEach(function (harvester) {
      roleHarvester.run(harvester);
    });

    upgraders.forEach(function (upgrader) {
      roleUpgrader.run(upgrader);
    });

    builders.forEach(function (builder) {
      roleBuilder.run(builder);
    });

    // 生成新的 creep
    if (Game.time - this.lastSpawningTextUpdateTick >= 5) {
      spawner.spawnCreeps();
      this.lastSpawningTextUpdateTick = Game.time;
    }

    // 路径计算函数
    if (Game.time - this.lastPathFindingTick >= this.pathFindingInterval) {
      this.calculatePaths();
      this.lastPathFindingTick = Game.time;
    }

    // 调用统计模块的updateStatistics方法
    var energyGainedThisTick = statisticsModule.updateStatistics();

    // 在主循环中调用定期清除函数
    memoryUtils.periodicMemoryCleanup(10);

    // 输出能量获取量
    console.log('能量获取量:', energyGainedThisTick);

    // 执行贝叶斯模型的决策
    for (var name in Game.creeps) {
      var creep = Game.creeps[name];
      if (creep.memory.role == 'harvester') {
        var energySource = bayesianLogic.selectEnergySource(creep);
        creep.memory.target = energySource ? energySource.id : null; // 设置采集者的目标能量源
      }
    }
  }

  calculatePaths() {
    var allCreeps = Object.values(Game.creeps);
    var groupedCreeps = this.groupCreepsByTarget(allCreeps);

    for (var target in groupedCreeps) {
      var targetCreeps = groupedCreeps[target];
      var targetObject = Game.getObjectById(target);

      if (targetObject) {
        targetCreeps.forEach(function (creep) {
          var currentPos = creep.pos;
          var targetPos = targetObject.pos;
          var path = currentPos.findPathTo(targetPos);
          creep.memory.path = path;
        });
      }
    }
  }

  groupCreepsByTarget(creeps) {
    var groups = {};
    for (var name in creeps) {
      var creep = creeps[name];
      var target = creep.memory.target;
      if (!groups[target]) {
        groups[target] = [];
      }
      groups[target].push(creep);
    }
    return groups;
  }
}

// 创建游戏管理器实例并运行主循环
var gameManager = new GameManager();
module.exports.loop = function () {
  gameManager.run();
};
