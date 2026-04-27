/* ===== GirlFit 核心功能 ===== */

// ===== 全局状态 =====
let reminderTimer = null;
let workoutTimer = null;
let workoutSeconds = 180; // 3分钟
let currentExercise = 0;
let sedentaryStartTime = Date.now();
let reminderCount = 0;
let workoutCount = 0;

// ===== 用户数据 =====
let userData = {
    age: 0,
    height: 0,
    weight: 0,
    bodyFat: 0,
    waist: 0,
    targetWeight: 0,
    experience: 'beginner',
    bodyType: '',
    healthConditions: [],
    bmi: 0,
    bmr: 0,
    tdee: 0,
    targetCalories: 0,
};

// ===== 课程数据库（支持远程更新） =====
// 远程数据源：GitHub上的courses.json文件
const COURSES_REMOTE_URL = 'https://raw.githubusercontent.com/luluy-blip/girlfit-website/main/courses.json';

// 本地内置课程（离线时使用）
let courses = [
    { id: 1, title: '帕梅拉 - 30分钟经典燃脂三部曲', type: 'cardio', level: '高级', duration: '34分钟', 部位: '全身', icon: '🔥', target: ['apple', 'rectangle'], video: 'https://www.bilibili.com/video/BV1VTddBHEDE/', desc: '暴汗内啡肽+最佳HIIT+站立腹肌HIIT 燃烧200-350卡' },
    { id: 2, title: '帕梅拉 - 10min 全身拉伸', type: 'stretch', level: '入门', duration: '10分钟', 部位: '全身', icon: '🧘', target: ['apple', 'pear', 'hourglass', 'rectangle', 'inverted-triangle'], video: 'https://www.bilibili.com/video/BV1gf4y1p78A/', desc: '运动后全身伸展 有效放松肌肉 增强灵活性' },
    { id: 3, title: '帕梅拉 - 9min 臀+腿拉伸', type: 'stretch', level: '入门', duration: '10分钟', 部位: '臀腿', icon: '🍑', target: ['pear', 'hourglass'], video: 'https://www.bilibili.com/video/BV1Tw411Z7sV/', desc: '拉长腿部线条 塑形臀部 缓解肌肉酸痛' },
    { id: 4, title: '髋关节灵活度训练 10分钟', type: 'stretch', level: '入门', duration: '10分钟', 部位: '髋部', icon: '🦴', target: ['apple', 'pear', 'hourglass', 'rectangle', 'inverted-triangle'], video: 'https://www.bilibili.com/video/BV1frcAevEp9/', desc: '10分钟完整版 提升髋关节活动度' },
    { id: 5, title: '普拉提100次瘦大腿内外侧', type: 'pilates', level: '初级', duration: '43分钟', 部位: '臀腿', icon: '🦵', target: ['pear', 'hourglass'], video: 'https://www.bilibili.com/video/BV1CueEzZE8Y/', desc: '普拉提专项训练 针对大腿内外侧塑形' },
    { id: 6, title: '欧阳春晓 - 足弓综合训练', type: 'correction', level: '入门', duration: '33分钟', 部位: '足部', icon: '🦶', target: ['apple', 'pear', 'hourglass', 'rectangle', 'inverted-triangle'], video: 'https://www.bilibili.com/video/BV1jMhczREHc/', desc: '足弓塌陷矫正 综合训练改善足部问题' },
];

// 从远程更新课程数据
async function updateCoursesFromRemote() {
    try {
        const resp = await fetch(COURSES_REMOTE_URL + '?t=' + Date.now());
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const remoteData = await resp.json();
        if (Array.isArray(remoteData) && remoteData.length > 0) {
            courses = remoteData;
            // 保存到本地缓存
            localStorage.setItem('gf_courses', JSON.stringify(courses));
            localStorage.setItem('gf_courses_updated', new Date().toLocaleString('zh-CN'));
            return { success: true, count: remoteData.length };
        }
        throw new Error('数据格式错误');
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// 从本地缓存加载课程
function loadCachedCourses() {
    const cached = localStorage.getItem('gf_courses');
    if (cached) {
        try {
            courses = JSON.parse(cached);
        } catch(e) {}
    }
    return localStorage.getItem('gf_courses_updated') || '未更新过';
}

// 初始化时加载缓存
loadCachedCourses();

// ===== 微运动动作库 =====
const microWorkouts = [
    [
        { name: '颈部环绕', duration: 30 },
        { name: '肩部耸肩', duration: 30 },
        { name: '坐姿扭转', duration: 30 },
        { name: '站立提踵', duration: 30 },
        { name: '深蹲起立', duration: 30 },
        { name: '拉伸放松', duration: 30 },
    ],
    [
        { name: '手腕转动', duration: 30 },
        { name: '猫牛式伸展', duration: 30 },
        { name: '站立前屈', duration: 30 },
        { name: '侧腰拉伸', duration: 30 },
        { name: '原地踏步', duration: 30 },
        { name: '深呼吸放松', duration: 30 },
    ],
    [
        { name: '眼保健操', duration: 30 },
        { name: '肩颈拉伸', duration: 30 },
        { name: '转体运动', duration: 30 },
        { name: '踮脚走路', duration: 30 },
        { name: '弓步压腿', duration: 30 },
        { name: '全身抖动', duration: 30 },
    ],
];

// ===== 饮食方案数据库 =====
const dietPlans = {
    apple: {
        low: { target: 1400, protein: 105, carb: 140, fat: 47 },
        mid: { target: 1600, protein: 120, carb: 160, fat: 53 },
        meals: {
            breakfast: ['全麦吐司1片 + 水煮蛋2个 + 脱脂牛奶200ml + 小番茄5颗', '燕麦粥(40g燕麦+200ml牛奶) + 水煮蛋1个 + 蓝莓一小把'],
            lunch: ['鸡胸肉100g + 糙米饭100g + 西兰花150g + 橄榄油5ml', '三文鱼80g + 荞麦面80g + 凉拌黄瓜 + 紫菜蛋花汤'],
            dinner: ['清蒸鱼100g + 蒜蓉西兰花 + 小碗杂粮粥', '豆腐200g + 番茄蛋汤 + 清炒时蔬'],
            snack: ['希腊酸奶100g + 坚果10g', '苹果1个 + 杏仁8颗'],
        }
    },
    pear: {
        low: { target: 1350, protein: 100, carb: 135, fat: 45 },
        mid: { target: 1550, protein: 115, carb: 155, fat: 52 },
        meals: {
            breakfast: ['紫薯1个 + 水煮蛋2个 + 豆浆200ml', '杂粮馒头半个 + 鸡蛋羹 + 凉拌菠菜'],
            lunch: ['牛肉100g + 糙米饭100g + 芦笋150g + 橄榄油5ml', '虾仁100g + 藜麦饭100g + 白灼生菜 + 冬瓜汤'],
            dinner: ['鸡胸肉沙拉(生菜+番茄+黄瓜+鸡胸肉80g)', '清炒虾仁100g + 蒜蓉油麦菜 + 小碗小米粥'],
            snack: ['低脂酸奶100g + 奇亚籽5g', '猕猴桃1个 + 核桃2颗'],
        }
    },
    hourglass: {
        low: { target: 1450, protein: 108, carb: 145, fat: 48 },
        mid: { target: 1650, protein: 123, carb: 165, fat: 55 },
        meals: {
            breakfast: ['牛油果吐司(全麦面包+半个牛油果) + 水煮蛋1个 + 美式咖啡', '奶昔(香蕉+蛋白粉+脱脂牛奶) + 坚果10g'],
            lunch: ['鸡腿肉去皮100g + 意面80g + 番茄酱 + 混合蔬菜', '烤三文鱼100g + 红薯100g + 沙拉'],
            dinner: ['清蒸鲈鱼100g + 蒜蓉娃娃菜 + 杂粮米饭小碗', '牛肉炒西兰花(牛肉80g) + 紫菜汤'],
            snack: ['蛋白棒1根', '香蕉1根 + 花生酱5g'],
        }
    },
    rectangle: {
        low: { target: 1500, protein: 112, carb: 150, fat: 50 },
        mid: { target: 1700, protein: 127, carb: 170, fat: 57 },
        meals: {
            breakfast: ['燕麦煎饼(燕麦40g+鸡蛋1个) + 蜂蜜少许 + 牛奶200ml', '三明治(全麦面包+鸡蛋+生菜+番茄) + 酸奶'],
            lunch: ['鸡胸肉120g + 藜麦饭120g + 彩椒炒牛肉丸 + 紫菜汤', '烤鸡腿去皮 + 红薯100g + 凉拌木耳'],
            dinner: ['虾仁豆腐煲 + 清炒芥蓝 + 小碗杂粮饭', '清蒸鱼100g + 番茄蛋汤 + 蒜蓉秋葵'],
            snack: ['全麦饼干3片 + 牛奶', '苹果1个 + 芝麻糊'],
        }
    },
    'inverted-triangle': {
        low: { target: 1400, protein: 105, carb: 140, fat: 47 },
        mid: { target: 1600, protein: 120, carb: 160, fat: 53 },
        meals: {
            breakfast: ['全麦贝果半个 + 烟熏三文鱼 + 低脂奶油芝士 + 黑咖啡', '紫薯燕麦粥 + 水煮蛋2个 + 蓝莓'],
            lunch: ['烤鸡胸100g + 糙米饭100g + 西兰花胡萝卜 + 橄榄油5ml', '牛肉丸汤面(荞麦面80g) + 凉拌海带丝'],
            dinner: ['清蒸虾仁100g + 蒜蓉菠菜 + 小碗杂粮粥', '鸡胸肉沙拉 + 番茄蛋花汤'],
            snack: ['希腊酸奶100g + 格兰诺拉', '橙子1个 + 杏仁8颗'],
        }
    },
};

// ===== 健康预警规则 =====
function analyzeHealthRisks(data) {
    const risks = [];

    // BMI分析
    if (data.bmi >= 28) {
        risks.push({ level: 'high', text: 'BMI偏高（肥胖范围），建议咨询医生制定减重方案', dept: '内分泌科/营养科' });
    } else if (data.bmi >= 24) {
        risks.push({ level: 'mid', text: 'BMI偏高（超重范围），通过饮食+运动调整可有效改善', dept: '' });
    }

    // 腰围分析（女性）
    if (data.waist && data.waist >= 85) {
        risks.push({ level: 'high', text: '腰围偏大，中心性肥胖风险较高，需关注代谢健康', dept: '内分泌科' });
    }

    // 皮质醇风险（压力胖）
    if (data.healthConditions.includes('high-pressure')) {
        risks.push({ level: 'mid', text: '长期压力大+睡眠不好，皮质醇可能偏高，会导致腹部脂肪堆积', dept: '建议检查皮质醇水平，咨询内分泌科' });
    }

    // 胰岛素抵抗风险
    if (data.healthConditions.includes('insulin')) {
        risks.push({ level: 'high', text: '已确认胰岛素抵抗，减重需特别注意碳水摄入，建议低GI饮食', dept: '内分泌科' });
    }

    // PCOS风险
    if (data.healthConditions.includes('pcos')) {
        risks.push({ level: 'high', text: 'PCOS患者减重难度较大，需要结合药物治疗+生活方式调整', dept: '妇科/内分泌科' });
    }

    // 甲状腺风险
    if (data.healthConditions.includes('thyroid')) {
        risks.push({ level: 'high', text: '甲状腺功能异常会影响代谢率，减重前请确认甲功指标正常', dept: '内分泌科' });
    }

    // 关节风险
    if (data.healthConditions.includes('knee')) {
        risks.push({ level: 'mid', text: '有关节问题，运动需避免高冲击动作，推荐游泳/瑜伽/骑车', dept: '骨科' });
    }

    // BMI正常但体脂高（隐性肥胖）
    if (data.bmi >= 18.5 && data.bmi < 24 && data.bodyFat >= 30) {
        risks.push({ level: 'mid', text: 'BMI正常但体脂率偏高，属于"隐性肥胖"，需要增加力量训练', dept: '' });
    }

    return risks;
}

// ===== 导航 =====
function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('show');
}

function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    // 关闭手机菜单
    document.querySelector('.nav-links').classList.remove('show');
}

// 导航高亮
window.addEventListener('scroll', () => {
    const sections = ['home', 'assess', 'courses', 'diet', 'community'];
    const scrollY = window.scrollY + 100;

    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const link = document.querySelector(`.nav-link[href="#${id}"]`);
            if (link) {
                if (scrollY >= top && scrollY < top + height) {
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            }
        }
    });
});

// ===== 核心评估功能 =====
function runAssessment() {
    // 收集数据
    userData.age = parseInt(document.getElementById('age').value) || 25;
    userData.height = parseFloat(document.getElementById('height').value) || 165;
    userData.weight = parseFloat(document.getElementById('weight').value) || 60;
    userData.bodyFat = parseFloat(document.getElementById('bodyFat').value) || 0;
    userData.waist = parseFloat(document.getElementById('waist').value) || 0;
    userData.targetWeight = parseFloat(document.getElementById('targetWeight').value) || 0;
    userData.experience = document.querySelector('input[name="experience"]:checked')?.value || 'beginner';
    userData.bodyType = document.querySelector('input[name="bodyType"]:checked')?.value || 'apple';
    userData.healthConditions = Array.from(document.querySelectorAll('input[name="health"]:checked')).map(cb => cb.value);

    // 验证必填项
    if (!userData.height || !userData.weight) {
        alert('请至少填写身高和体重！');
        return;
    }

    // 计算核心指标
    userData.bmi = (userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1);

    // 基础代谢率 (Mifflin-St Jeor公式，女性)
    userData.bmr = Math.round(10 * userData.weight + 6.25 * userData.height - 5 * userData.age - 161);

    // 活动系数
    const activityMultipliers = {
        'beginner': 1.2,
        'beginner-plus': 1.375,
        'intermediate': 1.55,
        'advanced': 1.725,
    };
    userData.tdee = Math.round(userData.bmr * (activityMultipliers[userData.experience] || 1.2));

    // 目标热量（减脂期，TDEE减300-500）
    userData.targetCalories = userData.tdee - 400;
    if (userData.targetCalories < 1200) userData.targetCalories = 1200;

    // 如果没设目标体重，自动设定
    if (!userData.targetWeight) {
        const idealBMI = 21;
        userData.targetWeight = Math.round(idealBMI * Math.pow(userData.height / 100, 2) * 10) / 10;
    }

    // 生成结果
    generateResults();
}

function generateResults() {
    const panel = document.getElementById('resultPanel');
    panel.style.display = 'block';

    // 滚动到结果
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth' }), 100);

    // BMI状态
    let bmiStatus = '';
    let bmiColor = '';
    if (userData.bmi < 18.5) { bmiStatus = '偏瘦'; bmiColor = 'success'; }
    else if (userData.bmi < 24) { bmiStatus = '正常'; bmiColor = 'success'; }
    else if (userData.bmi < 28) { bmiStatus = '超重'; bmiColor = 'warning'; }
    else { bmiStatus = '肥胖'; bmiColor = 'warning'; }

    // 需要减多少
    const weightToLose = Math.max(0, userData.weight - userData.targetWeight);
    const weeksNeeded = Math.ceil(weightToLose / 0.5); // 每周减0.5kg

    // 摘要
    document.getElementById('resultSummary').innerHTML = `
        你目前的BMI为 <strong class="${bmiColor}">${userData.bmi}</strong>（${bmiStatus}），
        基础代谢率为 <strong>${userData.bmr}</strong> kcal/天，
        建议每日摄入 <strong>${userData.targetCalories}</strong> kcal。
        ${weightToLose > 0 ? `预计需要 <strong>${weeksNeeded}</strong> 周达到目标体重。` : '你的体重在健康范围内！'}
    `;

    // 身体数据
    document.getElementById('resultBodyData').innerHTML = `
        <div>BMI：<span class="highlight">${userData.bmi}</span>（${bmiStatus}）</div>
        <div>基础代谢率：<span class="highlight">${userData.bmr}</span> kcal/天</div>
        <div>每日总消耗(TDEE)：<span class="highlight">${userData.tdee}</span> kcal</div>
        <div>建议每日摄入：<span class="highlight">${userData.targetCalories}</span> kcal</div>
        ${userData.bodyFat ? `<div>体脂率：<span class="highlight">${userData.bodyFat}%</span></div>` : ''}
    `;

    // 目标
    document.getElementById('resultGoal').innerHTML = `
        <div>当前体重：<span class="highlight">${userData.weight}</span> kg</div>
        <div>目标体重：<span class="highlight">${userData.targetWeight}</span> kg</div>
        <div>需减重：<span class="highlight">${weightToLose.toFixed(1)}</span> kg</div>
        <div>预计周期：<span class="highlight">${weeksNeeded}</span> 周</div>
        <div>每周目标：减 <span class="highlight">0.5</span> kg</div>
    `;

    // 健康预警
    const risks = analyzeHealthRisks(userData);
    let healthHtml = '';
    if (risks.length === 0) {
        healthHtml = '<div class="success">暂未发现明显健康风险，请继续保持！</div>';
    } else {
        risks.forEach(r => {
            const levelIcon = r.level === 'high' ? '🔴' : '🟡';
            healthHtml += `<div style="margin-bottom:8px;">${levelIcon} <span class="${r.level === 'high' ? 'warning' : ''}">${r.text}</span>${r.dept ? `<br><small style="color:#9B9BB0;">建议科室：${r.dept}</small>` : ''}</div>`;
        });
    }
    document.getElementById('resultHealth').innerHTML = healthHtml;

    // 运动建议
    const exerciseMap = {
        'beginner': '每周3次，每次20-30分钟，以低强度有氧为主（快走、瑜伽、轻度舞蹈）',
        'beginner-plus': '每周3-4次，每次30分钟，有氧+基础力量训练结合',
        'intermediate': '每周4-5次，每次30-45分钟，有氧+力量训练交替进行',
        'advanced': '每周5-6次，每次45-60分钟，高强度间歇训练+力量训练',
    };
    document.getElementById('resultExercise').innerHTML = `
        <div style="margin-bottom:8px;">${exerciseMap[userData.experience]}</div>
        <div>推荐运动类型：${getRecommendedExercises(userData.bodyType)}</div>
    `;

    // 饮食建议
    generateDietPlan();

    // 推荐课程
    generateRecommendedCourses();
}

function getRecommendedExercises(bodyType) {
    const map = {
        'apple': '有氧燃脂 + 核心训练（避免过度腹部压力）',
        'pear': '臀腿塑形 + 有氧（重点下半身力量）',
        'hourglass': '全身均衡训练 + 柔韧性保持',
        'rectangle': '力量增肌 + 曲线塑造',
        'inverted-triangle': '背部+手臂塑形 + 下肢力量训练',
    };
    return map[bodyType] || '全身均衡训练';
}

function generateDietPlan() {
    const plan = dietPlans[userData.bodyType] || dietPlans['apple'];
    const usePlan = userData.targetCalories <= 1500 ? plan.low : plan.mid;

    // 更新宏量营养素条
    const total = usePlan.protein + usePlan.carb + usePlan.fat;
    document.getElementById('proteinBar').style.width = (usePlan.protein / total * 100) + '%';
    document.getElementById('carbBar').style.width = (usePlan.carb / total * 100) + '%';
    document.getElementById('fatBar').style.width = (usePlan.fat / total * 100) + '%';
    document.getElementById('proteinValue').textContent = usePlan.protein + 'g';
    document.getElementById('carbValue').textContent = usePlan.carb + 'g';
    document.getElementById('fatValue').textContent = usePlan.fat + 'g';

    // 更新热量圆环
    const ring = document.getElementById('calorieRing');
    ring.style.strokeDashoffset = 314; // 全满（未进食）
    document.getElementById('calorieConsumed').textContent = '0';
    document.getElementById('calorieTarget').textContent = usePlan.target;

    // 更新餐食建议
    const mealKeys = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealNames = ['早餐', '午餐', '晚餐', '加餐'];
    mealKeys.forEach((key, i) => {
        const contentEl = document.getElementById(key + 'Content');
        const foods = plan.meals[key];
        const randomFood = foods[Math.floor(Math.random() * foods.length)];
        contentEl.innerHTML = `<div class="meal-foods">${randomFood.split('+').map(f => `<div>• ${f.trim()}</div>`).join('')}</div>`;
    });

    // 卡路里分配
    const calSplit = [
        Math.round(usePlan.target * 0.25),  // 早餐 25%
        Math.round(usePlan.target * 0.35),  // 午餐 35%
        Math.round(usePlan.target * 0.25),  // 晚餐 25%
        Math.round(usePlan.target * 0.15),  // 加餐 15%
    ];
    document.getElementById('breakfastCal').textContent = `~${calSplit[0]} kcal`;
    document.getElementById('lunchCal').textContent = `~${calSplit[1]} kcal`;
    document.getElementById('dinnerCal').textContent = `~${calSplit[2]} kcal`;
    document.getElementById('snackCal').textContent = `~${calSplit[3]} kcal`;
}

function generateRecommendedCourses() {
    const courseList = document.getElementById('courseList');
    const recommended = courses.filter(c => c.target.includes(userData.bodyType)).slice(0, 6);

    courseList.innerHTML = recommended.map(c => `
        <div class="mini-course" onclick="${c.video ? `playVideo('${c.video}','${c.title}')` : `alert('🎬 视频即将上线！\\n\\n课程：${c.title}\\n时长：${c.duration}\\n难度：${c.level}')`}">
            <div class="mini-course-icon">${c.icon}</div>
            <div class="mini-course-title">${c.title}</div>
            <div class="mini-course-meta">${c.duration} · ${c.level} · ${c.部位}</div>
        </div>
    `).join('');
}

function resetAssessment() {
    document.getElementById('resultPanel').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 课程筛选 =====
function filterCourses(type, el) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');

    const grid = document.getElementById('coursesGrid');
    const filtered = type === 'all' ? courses : courses.filter(c => c.type === type);

    grid.innerHTML = filtered.map(c => `
        <div class="course-card" onclick="${c.video ? `playVideo('${c.video}','${c.title}')` : `alert('🎬 视频即将上线！\\n\\n课程：${c.title}\\n时长：${c.duration}\\n难度：${c.level}')`}">
            <div class="course-thumb">
                ${c.icon}
                <span class="course-duration">${c.duration}</span>
            </div>
            <div class="course-info">
                <div class="course-title">${c.title}</div>
                <div class="course-meta">
                    <span class="course-tag">${c.type === 'cardio' ? '有氧燃脂' : c.type === 'pilates' ? '普拉提' : c.type === 'stretch' ? '拉伸放松' : c.type === 'correction' ? '体态矫正' : c.type}</span>
                    <span class="course-tag">${c.level}</span>
                    <span class="course-tag">${c.部位}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 初始化课程列表
// ===== 在线更新功能 =====
async function handleUpdateCourses() {
    const btn = document.getElementById('updateBtn');
    const lastUpdateEl = document.getElementById('lastUpdate');
    btn.textContent = '更新中...';
    btn.disabled = true;

    const result = await updateCoursesFromRemote();

    if (result.success) {
        btn.textContent = '✅ 已更新';
        lastUpdateEl.textContent = localStorage.getItem('gf_courses_updated');
        // 重新渲染课程列表
        initCourses();
        // 重新渲染评估推荐（如果有的话）
        if (document.getElementById('resultPanel').style.display !== 'none') {
            generateRecommendedCourses();
        }
        setTimeout(() => { btn.textContent = '检查更新'; btn.disabled = false; }, 2000);
    } else {
        btn.textContent = '❌ 更新失败';
        setTimeout(() => { btn.textContent = '检查更新'; btn.disabled = false; }, 2000);
    }
}

// 页面加载时显示上次更新时间
function showLastUpdate() {
    const el = document.getElementById('lastUpdate');
    if (el) {
        el.textContent = localStorage.getItem('gf_courses_updated') || '未更新过';
    }
}

function initCourses() {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;
    grid.innerHTML = courses.map(c => `
        <div class="course-card" onclick="${c.video ? `playVideo('${c.video}','${c.title}')` : `alert('🎬 视频即将上线！\\n\\n课程：${c.title}\\n时长：${c.duration}\\n难度：${c.level}')`}">
            <div class="course-thumb">
                ${c.icon}
                <span class="course-duration">${c.duration}</span>
            </div>
            <div class="course-info">
                <div class="course-title">${c.title}</div>
                ${c.desc ? `<div class="course-desc">${c.desc}</div>` : ''}
                <div class="course-meta">
                    <span class="course-tag">${c.type === 'cardio' ? '有氧燃脂' : c.type === 'pilates' ? '普拉提' : c.type === 'stretch' ? '拉伸放松' : c.type === 'correction' ? '体态矫正' : c.type}</span>
                    <span class="course-tag">${c.level}</span>
                    <span class="course-tag">${c.部位}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== 食物拍照识别（模拟） =====
function handleFoodPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const resultDiv = document.getElementById('foodResult');
    const identifiedDiv = document.getElementById('foodIdentified');
    const caloriesDiv = document.getElementById('foodCalories');

    // 模拟AI识别
    identifiedDiv.textContent = '🔍 正在识别...';
    caloriesDiv.textContent = '';
    resultDiv.style.display = 'block';

    setTimeout(() => {
        // 模拟识别结果
        const foods = [
            { name: '鸡胸肉沙拉', calories: 320, protein: 28, carb: 15, fat: 16 },
            { name: '番茄炒蛋配米饭', calories: 450, protein: 18, carb: 65, fat: 12 },
            { name: '牛肉面', calories: 520, protein: 25, carb: 70, fat: 14 },
            { name: '水果酸奶碗', calories: 280, protein: 12, carb: 45, fat: 6 },
            { name: '三明治', calories: 380, protein: 20, carb: 42, fat: 14 },
        ];
        const detected = foods[Math.floor(Math.random() * foods.length)];

        identifiedDiv.innerHTML = `✅ 识别结果：<strong>${detected.name}</strong>`;
        caloriesDiv.innerHTML = `
            预估热量：<strong>${detected.calories} kcal</strong><br>
            蛋白质 ${detected.protein}g · 碳水 ${detected.carb}g · 脂肪 ${detected.fat}g
        `;
    }, 1500);
}

// ===== 久坐提醒功能 =====
function startReminder() {
    if (reminderTimer) {
        clearInterval(reminderTimer);
    }

    const interval = parseInt(document.getElementById('reminderInterval').value) * 60 * 1000;
    sedentaryStartTime = Date.now();

    reminderTimer = setInterval(() => {
        reminderCount++;
        document.getElementById('reminderCount').textContent = reminderCount;
        showReminderModal();
    }, interval);

    // 更新状态
    document.querySelector('.status-dot').classList.add('active');
    document.getElementById('statusText').textContent = `已启动 · 每${document.getElementById('reminderInterval').value}分钟提醒`;

    alert('久坐提醒已启动！\n\n每隔' + document.getElementById('reminderInterval').value + '分钟会弹出提醒。');
}

function stopReminder() {
    if (reminderTimer) {
        clearInterval(reminderTimer);
        reminderTimer = null;
    }
    document.querySelector('.status-dot').classList.remove('active');
    document.getElementById('statusText').textContent = '已停止';
}

function showReminderModal() {
    const modal = document.getElementById('reminderModal');
    const sedentaryMins = Math.floor((Date.now() - sedentaryStartTime) / 60000);
    document.getElementById('sedentaryMinutes').textContent = sedentaryMins;
    modal.style.display = 'flex';

    // 尝试播放提示音
    if (document.getElementById('soundToggle').checked) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
        } catch (e) { }
    }

    // 尝试浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('GirlFit 久坐提醒', {
            body: `你已经坐了${sedentaryMins}分钟啦！站起来动一动吧～`,
            icon: '💪',
        });
    }
}

function closeReminderModal() {
    document.getElementById('reminderModal').style.display = 'none';
    document.getElementById('popupWorkout').style.display = 'none';
}

function snoozeReminder() {
    closeReminderModal();
    // 5分钟后再提醒
    setTimeout(showReminderModal, 5 * 60 * 1000);
}

function startPopupWorkout() {
    const popupWorkout = document.getElementById('popupWorkout');
    popupWorkout.style.display = 'block';

    const workoutSet = microWorkouts[Math.floor(Math.random() * microWorkouts.length)];
    let exerciseIndex = 0;

    function showExercise() {
        if (exerciseIndex >= workoutSet.length) {
            popupWorkout.style.display = 'none';
            closeReminderModal();
            workoutCount++;
            document.getElementById('workoutCount').textContent = workoutCount;
            document.getElementById('activeTime').textContent = parseInt(document.getElementById('activeTime').textContent) + 3;
            return;
        }

        const ex = workoutSet[exerciseIndex];
        document.getElementById('popupExerciseName').textContent = ex.name;
        let countdown = ex.duration;

        const timer = setInterval(() => {
            document.getElementById('popupExerciseTimer').textContent = countdown + 's';
            countdown--;
            if (countdown < 0) {
                clearInterval(timer);
                exerciseIndex++;
                showExercise();
            }
        }, 1000);
    }

    showExercise();
}

// ===== 主页面微运动 =====
function startWorkout() {
    if (workoutTimer) {
        clearInterval(workoutTimer);
        workoutTimer = null;
        document.querySelector('#workoutTimer .timer-display').textContent = '03:00';
        document.querySelectorAll('.exercise-item').forEach(el => el.classList.remove('active'));
        return;
    }

    const workoutSet = microWorkouts[0]; // 使用第一组
    let totalSeconds = workoutSet.reduce((sum, ex) => sum + ex.duration, 0);
    let currentExIndex = 0;
    let exCountdown = workoutSet[0].duration;

    workoutTimer = setInterval(() => {
        totalSeconds--;
        exCountdown--;

        // 更新总时间
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        document.querySelector('#workoutTimer .timer-display').textContent =
            String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

        // 高亮当前动作
        document.querySelectorAll('.exercise-item').forEach((el, i) => {
            el.classList.toggle('active', i === currentExIndex);
        });

        // 当前动作倒计时
        if (exCountdown <= 0) {
            currentExIndex++;
            if (currentExIndex < workoutSet.length) {
                exCountdown = workoutSet[currentExIndex].duration;
            }
        }

        if (totalSeconds <= 0) {
            clearInterval(workoutTimer);
            workoutTimer = null;
            workoutCount++;
            document.getElementById('workoutCount').textContent = workoutCount;
            document.getElementById('activeTime').textContent = parseInt(document.getElementById('activeTime').textContent) + 3;
            document.querySelector('#workoutTimer .timer-display').textContent = '03:00';
            document.querySelectorAll('.exercise-item').forEach(el => el.classList.remove('active'));
            alert('🎉 恭喜完成本次微运动！\n坚持就是胜利！');
        }
    }, 1000);
}

// ===== 久坐计时器（模拟） =====
function startSedentaryTracker() {
    setInterval(() => {
        const mins = Math.floor((Date.now() - sedentaryStartTime) / 60000);
        document.getElementById('sedentaryTime').textContent = mins;
    }, 60000);
}

// ===== 记录页面功能 =====
let dietRecords = JSON.parse(localStorage.getItem('gf_diet_records') || '[]');
let exerciseRecords = JSON.parse(localStorage.getItem('gf_exercise_records') || '[]');

function getTodayStr() {
    return new Date().toLocaleDateString('zh-CN');
}

function addDietRecord(name, calories, protein, carb, fat, icon) {
    const record = {
        id: Date.now(),
        date: getTodayStr(),
        name, calories, protein, carb, fat,
        icon: icon || '🍽️',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    dietRecords.push(record);
    localStorage.setItem('gf_diet_records', JSON.stringify(dietRecords));
    refreshRecordsPage();
}

function addManualDietRecord() {
    const name = prompt('食物名称：');
    if (!name) return;
    const cal = parseInt(prompt('热量（千卡）：') || '0');
    addDietRecord(name, cal, 0, 0, 0, '🍽️');
}

function deleteDietRecord(id) {
    dietRecords = dietRecords.filter(r => r.id !== id);
    localStorage.setItem('gf_diet_records', JSON.stringify(dietRecords));
    refreshRecordsPage();
}

function addExerciseRecord(name, duration, calories) {
    const record = {
        id: Date.now(),
        date: getTodayStr(),
        name, duration, calories,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    exerciseRecords.push(record);
    localStorage.setItem('gf_exercise_records', JSON.stringify(exerciseRecords));
    refreshRecordsPage();
}

function deleteExerciseRecord(id) {
    exerciseRecords = exerciseRecords.filter(r => r.id !== id);
    localStorage.setItem('gf_exercise_records', JSON.stringify(exerciseRecords));
    refreshRecordsPage();
}

function refreshRecordsPage() {
    const today = getTodayStr();
    const todayDiets = dietRecords.filter(r => r.date === today);
    const todayExercises = exerciseRecords.filter(r => r.date === today);

    // 饮食历史
    const dietList = document.getElementById('dietHistoryList');
    if (todayDiets.length === 0) {
        dietList.innerHTML = '<p class="history-empty">还没有记录，拍照或手动添加今天的饮食吧～</p>';
    } else {
        const totalCal = todayDiets.reduce((s, r) => s + r.calories, 0);
        dietList.innerHTML = todayDiets.map(r => `
            <div class="history-item">
                <span class="history-item-icon">${r.icon}</span>
                <div class="history-item-info">
                    <div class="history-item-name">${r.name}</div>
                    <div class="history-item-meta">${r.time}</div>
                </div>
                <span class="history-item-cal">${r.calories} kcal</span>
                <button class="history-item-del" onclick="deleteDietRecord(${r.id})">✕</button>
            </div>
        `).join('') + `<div style="text-align:center;padding:8px;font-size:14px;color:var(--text-light);">今日合计：<strong style="color:var(--primary)">${totalCal}</strong> kcal</div>`;
    }

    // 运动历史
    const exList = document.getElementById('exerciseHistoryList');
    if (todayExercises.length === 0) {
        exList.innerHTML = '<p class="history-empty">今天还没有运动记录，去课程区跟练吧～</p>';
    } else {
        const totalDur = todayExercises.reduce((s, r) => s + r.duration, 0);
        const totalCal = todayExercises.reduce((s, r) => s + r.calories, 0);
        exList.innerHTML = todayExercises.map(r => `
            <div class="history-item">
                <span class="history-item-icon">🏃</span>
                <div class="history-item-info">
                    <div class="history-item-name">${r.name}</div>
                    <div class="history-item-meta">${r.time} · ${r.duration}分钟</div>
                </div>
                <span class="history-item-cal">${r.calories} kcal</span>
                <button class="history-item-del" onclick="deleteExerciseRecord(${r.id})">✕</button>
            </div>
        `).join('') + `<div style="text-align:center;padding:8px;font-size:14px;color:var(--text-light);">今日合计：<strong style="color:var(--primary)">${totalDur}</strong> 分钟 · <strong style="color:var(--primary)">${totalCal}</strong> kcal</div>`;
    }
}

// ===== 计划页面功能 =====
let planData = JSON.parse(localStorage.getItem('gf_plan_data') || '{}');
let planDate = new Date();

function getPlanKey(date) {
    return date.toLocaleDateString('zh-CN');
}

function refreshPlanPage() {
    const key = getPlanKey(planDate);
    const plans = planData[key] || [];
    const timeline = document.getElementById('planTimeline');
    const dateEl = document.getElementById('planDate');
    const summary = document.getElementById('planSummary');

    // 更新日期显示
    const today = new Date();
    if (planDate.toDateString() === today.toDateString()) {
        dateEl.textContent = '今天';
    } else {
        dateEl.textContent = planDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
    }

    if (plans.length === 0) {
        timeline.innerHTML = `<div class="timeline-empty"><div class="empty-icon">📅</div><p>今天还没有安排训练</p><button class="btn btn-primary" onclick="showAddPlanModal()">+ 添加训练</button></div>`;
        summary.style.display = 'none';
    } else {
        // 按时间排序
        plans.sort((a, b) => a.time.localeCompare(b.time));
        timeline.innerHTML = plans.map((p, i) => `
            <div class="plan-item">
                <span class="plan-item-time">${p.time}</span>
                <div class="plan-item-info">
                    <div class="plan-item-name">${p.icon || '🏋️'} ${p.name}</div>
                    <div class="plan-item-meta">${p.duration}分钟 · ${p.type}</div>
                </div>
                <button class="plan-item-del" onclick="deletePlanItem('${key}', ${i})">✕</button>
            </div>
        `).join('');

        const totalDur = plans.reduce((s, p) => s + (p.duration || 0), 0);
        document.getElementById('planTotalCount').textContent = plans.length;
        document.getElementById('planTotalDuration').textContent = totalDur;
        document.getElementById('planTotalCal').textContent = Math.round(totalDur * 5);
        summary.style.display = 'flex';
    }
}

function planPrevDay() {
    planDate.setDate(planDate.getDate() - 1);
    refreshPlanPage();
}

function planNextDay() {
    planDate.setDate(planDate.getDate() + 1);
    refreshPlanPage();
}

function showAddPlanModal() {
    const select = document.getElementById('planCourseSelect');
    select.innerHTML = courses.map(c => `<option value="${c.id}">${c.icon} ${c.title} (${c.duration})</option>`).join('');
    document.getElementById('addPlanModal').style.display = 'flex';
}

function closeAddPlanModal() {
    document.getElementById('addPlanModal').style.display = 'none';
}

function confirmAddPlan() {
    const courseId = parseInt(document.getElementById('planCourseSelect').value);
    const time = document.getElementById('planTime').value;
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const key = getPlanKey(planDate);
    if (!planData[key]) planData[key] = [];

    planData[key].push({
        courseId: course.id,
        name: course.title,
        icon: course.icon,
        duration: parseInt(course.duration) || 30,
        type: course.type === 'cardio' ? '有氧燃脂' : course.type === 'pilates' ? '普拉提' : course.type === 'stretch' ? '拉伸放松' : '体态矫正',
        time: time
    });

    localStorage.setItem('gf_plan_data', JSON.stringify(planData));
    closeAddPlanModal();
    refreshPlanPage();
}

function deletePlanItem(key, index) {
    if (planData[key]) {
        planData[key].splice(index, 1);
        localStorage.setItem('gf_plan_data', JSON.stringify(planData));
        refreshPlanPage();
    }
}

// ===== 我的页面 =====
function refreshProfilePage() {
    // 用户数据
    if (userData.height) document.getElementById('pdHeight').textContent = userData.height + ' cm';
    if (userData.weight) document.getElementById('pdWeight').textContent = userData.weight + ' kg';
    if (userData.bmi) document.getElementById('pdBMI').textContent = userData.bmi;
    if (userData.bodyType) {
        const typeMap = { apple: '🍎 苹果型', pear: '🍐 梨型', hourglass: '⏳ 沙漏型', rectangle: '📏 矩形型', 'inverted-triangle': '🔺 倒三角型' };
        document.getElementById('pdBodyType').textContent = typeMap[userData.bodyType] || userData.bodyType;
    }
    if (userData.bmr) document.getElementById('pdBMR').textContent = userData.bmr + ' kcal';
    if (userData.targetWeight) document.getElementById('pdTarget').textContent = userData.targetWeight + ' kg';

    // 统计数据
    const allDays = new Set([...dietRecords.map(r => r.date), ...exerciseRecords.map(r => r.date)]);
    document.getElementById('profileDays').textContent = allDays.size;
    document.getElementById('profileWorkouts').textContent = exerciseRecords.length;
    document.getElementById('profileCalories').textContent = exerciseRecords.reduce((s, r) => s + r.calories, 0);
    document.getElementById('profileMinutes').textContent = exerciseRecords.reduce((s, r) => s + r.duration, 0);

    // 登录状态
    const userName = localStorage.getItem('gf_user_name');
    if (userName) {
        document.getElementById('profileName').textContent = userName;
    }
}

// ===== 登录功能 =====
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

let codeTimer = null;
function sendLoginCode() {
    const phone = document.getElementById('loginPhone').value;
    if (!phone || phone.length !== 11) {
        alert('请输入正确的手机号');
        return;
    }
    const btn = document.getElementById('sendCodeBtn');
    btn.disabled = true;
    let sec = 60;
    btn.textContent = sec + 's';
    codeTimer = setInterval(() => {
        sec--;
        btn.textContent = sec + 's';
        if (sec <= 0) {
            clearInterval(codeTimer);
            btn.textContent = '发送验证码';
            btn.disabled = false;
        }
    }, 1000);
    // 模拟发送（实际需要对接短信API）
    alert('验证码已发送（演示模式，任意输入6位数字即可登录）');
}

function doLogin() {
    const phone = document.getElementById('loginPhone').value;
    const code = document.getElementById('loginCode').value;
    if (!phone || phone.length !== 11) { alert('请输入正确的手机号'); return; }
    if (!code || code.length < 4) { alert('请输入验证码'); return; }

    // 模拟登录成功
    localStorage.setItem('gf_user_phone', phone);
    localStorage.setItem('gf_user_name', '用户' + phone.slice(-4));
    document.getElementById('profileName').textContent = '用户' + phone.slice(-4);
    closeLoginModal();
    alert('登录成功！');
}

// ===== 数据管理 =====
function exportUserData() {
    const data = {
        userData,
        dietRecords,
        exerciseRecords,
        planData,
        exportTime: new Date().toLocaleString('zh-CN')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'girlfit-data-' + new Date().toLocaleDateString('zh-CN') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('数据已导出！');
}

function clearAllData() {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return;
    localStorage.removeItem('gf_diet_records');
    localStorage.removeItem('gf_exercise_records');
    localStorage.removeItem('gf_plan_data');
    localStorage.removeItem('gf_courses');
    localStorage.removeItem('gf_user_name');
    localStorage.removeItem('gf_user_phone');
    dietRecords = [];
    exerciseRecords = [];
    planData = {};
    alert('所有数据已清除！');
    location.reload();
}

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initCourses();
    showLastUpdate();
    startSedentaryTracker();

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // 滚动动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .course-card, .post-card').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
});
