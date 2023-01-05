// @ts-nocheck
import {
  Fragment,
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import ElCheckbox from '@element-plus/components/checkbox'
import { isString } from '@element-plus/utils'
import { cellStarts } from '../config'
import { compose, mergeOptions } from '../util'
import useWatcher from './watcher-helper'
import useRender from './render-helper'
import defaultProps from './defaults'
import type { TableColumn, TableColumnCtx } from './defaults'

import type { DefaultRow } from '../table/defaults'

let columnIdSeed = 1

export default defineComponent({
  name: 'ElTableColumn',
  components: {
    ElCheckbox,
  },
  props: defaultProps,
  setup(props, { slots }) {
    const instance = getCurrentInstance() as TableColumn<DefaultRow>
    const columnConfig = ref<Partial<TableColumnCtx<DefaultRow>>>({})
    const owner = computed(() => {
      let parent = instance.parent as any
      while (parent && !parent.tableId) {
        parent = parent.parent
      }
      return parent
    })

    const { registerNormalWatchers, registerComplexWatchers } = useWatcher(
      owner,
      props
    )
    const {
      columnId,
      isSubColumn,
      realHeaderAlign,
      columnOrTableParent,
      setColumnWidth,
      setColumnForcedProps,
      setColumnRenders,
      getPropsData,
      getColumnElIndex,
      realAlign,
      columnClassName,
      filterColumnDom,
    } = useRender(props as unknown as TableColumnCtx<unknown>, slots, owner)

    const parent = columnOrTableParent.value
    columnId.value = `${
      parent.tableId || parent.columnId
    }_column_${columnIdSeed++}`
    onBeforeMount(() => {
      isSubColumn.value = owner.value !== parent

      const type = props.type || 'default'
      const sortable = props.sortable === '' ? true : props.sortable
      const defaults = {
        ...cellStarts[type],
        id: columnId.value,
        type,
        property: props.prop || props.property,
        align: realAlign,
        headerAlign: realHeaderAlign,
        showOverflowTooltip: props.showOverflowTooltip,
        // filter 相关属性
        filterable: props.filters || props.filterMethod,
        filteredValue: [],
        filterPlacement: '',
        isColumnGroup: false,
        isSubColumn: false,
        filterOpened: false,
        // sort 相关属性
        sortable,
        // index 列
        index: props.index,
        // <el-table-column key="xxx" />
        rawColumnKey: instance.vnode.key,
      }

      const basicProps = [
        'columnKey',
        'label',
        'className',
        'labelClassName',
        'type',
        'renderHeader',
        'formatter',
        'fixed',
        'resizable',
      ]
      const sortProps = ['sortMethod', 'sortBy', 'sortOrders']
      const selectProps = ['selectable', 'reserveSelection']
      const filterProps = [
        'filterMethod',
        'filters',
        'filterMultiple',
        'filterOpened',
        'filteredValue',
        'filterPlacement',
      ]

      let column = getPropsData(basicProps, sortProps, selectProps, filterProps)

      column = mergeOptions(defaults, column)
      // 注意 compose 中函数执行的顺序是从右到左
      const chains = compose(
        setColumnRenders,
        setColumnWidth,
        setColumnForcedProps
      )
      column = chains(column)
      columnConfig.value = column

      // 注册 watcher
      registerNormalWatchers()
      registerComplexWatchers()
    })
    onMounted(() => {
      const parent = columnOrTableParent.value
      const parentDom = isSubColumn.value
        ? parent.vnode.el
        : parent.refs.hiddenColumns
      // console.log('parent', parentDom)
      const children = filterColumnDom(parentDom)
      const getColumnIndex = () =>
        getColumnElIndex(children || [], instance.vnode.el)
      columnConfig.value.getColumnIndex = getColumnIndex
      const columnIndex = getColumnIndex()
      columnIndex > -1 &&
        owner.value.store.commit(
          'insertColumn',
          columnConfig.value,
          isSubColumn.value ? parent.columnConfig.value : null
        )
    })
    onBeforeUnmount(() => {
      owner.value.store.commit(
        'removeColumn',
        columnConfig.value,
        isSubColumn.value ? parent.columnConfig.value : null
      )
    })
    instance.columnId = columnId.value

    instance.columnConfig = columnConfig
    return {
      columnId: columnId.value,
      columnClassName,
    }
  },
  render() {
    try {
      const renderDefault = this.$slots.default?.({
        row: {},
        column: {},
        $index: -1,
      })
      console.log('times')
      debugger
      return h(
        'div',
        { className: this.columnClassName, 'column-id': this.columnId },
        renderDefault
      )
    } catch {
      return h(
        'div',
        { className: this.columnClassName, 'column-id': this.columnId },
        []
      )
    }
  },
})
